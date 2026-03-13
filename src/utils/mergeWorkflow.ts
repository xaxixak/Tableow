import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  EdgeSubStep,
  LaneDefinition,
  StageDefinition,
  GridPlacement,
  GridConfig,
  NodeDefinition,
  CategoryDefinition,
} from '@/types/index.ts'
import {
  getNextCategoryNumber,
  getNextNodeNumber,
  getNextEdgeNumber,
} from './numbering.ts'

export interface MergeResult {
  newNodes: WorkflowNode[]
  newEdges: WorkflowEdge[]
  newLanes: LaneDefinition[]
  newStages: StageDefinition[]
  newPlacements: GridPlacement[]
  newCategories: CategoryDefinition[]
  newNodeTypes: NodeDefinition[]
}

export interface MergeContext {
  existingNodes: WorkflowNode[]
  existingEdges: WorkflowEdge[]
  existingGridConfig: GridConfig
  existingCategories: CategoryDefinition[]
  existingNodeTypes: NodeDefinition[]
}

// --- Phase helpers ---

function matchItemsRecursively<T extends { id: string; label: string; parentId?: string; order: number }>(
  incomingItems: T[],
  existingItems: T[],
  parentIdIncoming: string | undefined,
  parentIdExisting: string | undefined,
  idMap: Map<string, string>,
  newItems: T[],
  allItems: T[],
) {
  const incomingAtLevel = incomingItems.filter(
    (item) => (item.parentId ?? undefined) === parentIdIncoming
  )
  const existingAtLevel = existingItems.filter(
    (item) => (item.parentId ?? undefined) === parentIdExisting
  )

  // Find max order at the existing parent level for appending new items
  let maxOrder = 0
  for (const item of allItems) {
    if ((item.parentId ?? undefined) === parentIdExisting && item.order > maxOrder) {
      maxOrder = item.order
    }
  }

  for (const incoming of incomingAtLevel) {
    // Try to match by label (exact, case-sensitive)
    const match = existingAtLevel.find(
      (e) => e.label.trim() === incoming.label.trim()
    )

    if (match) {
      idMap.set(incoming.id, match.id)
    } else {
      const newId = crypto.randomUUID()
      idMap.set(incoming.id, newId)
      maxOrder++
      const newItem = {
        ...incoming,
        id: newId,
        parentId: parentIdExisting,
        order: maxOrder,
      } as T
      newItems.push(newItem)
      allItems.push(newItem)
    }

    // Recurse into children
    matchItemsRecursively(
      incomingItems,
      existingItems,
      incoming.id,
      idMap.get(incoming.id)!,
      idMap,
      newItems,
      allItems,
    )
  }
}

export function mergeWorkflow(
  existing: MergeContext,
  incoming: Workflow,
): MergeResult {
  const laneIdMap = new Map<string, string>()
  const stageIdMap = new Map<string, string>()
  const nodeIdMap = new Map<string, string>()
  const nodeTypeMap = new Map<string, string>()
  const categoryNumberMap = new Map<string, string>()

  const newLanes: LaneDefinition[] = []
  const newStages: StageDefinition[] = []
  const newCategories: CategoryDefinition[] = []
  const newNodeTypes: NodeDefinition[] = []
  const newNodes: WorkflowNode[] = []
  const newEdges: WorkflowEdge[] = []
  const newPlacements: GridPlacement[] = []

  const incomingGrid = incoming.gridConfig ?? { lanes: [], stages: [], placements: [] }
  const incomingCategories = incoming.customCategories ?? []
  const incomingNodeTypes = incoming.customNodeTypes ?? []

  // Running lists that grow as we add items (for numbering)
  const allLanes: LaneDefinition[] = [...existing.existingGridConfig.lanes]
  const allStages: StageDefinition[] = [...existing.existingGridConfig.stages]
  const allCategories: CategoryDefinition[] = [...existing.existingCategories]
  const allNodeTypes: NodeDefinition[] = [...existing.existingNodeTypes]
  const allEdges: WorkflowEdge[] = [...existing.existingEdges]

  // --- Phase 1: Match/Create Lanes ---
  matchItemsRecursively(
    incomingGrid.lanes,
    existing.existingGridConfig.lanes,
    undefined,
    undefined,
    laneIdMap,
    newLanes,
    allLanes,
  )

  // --- Phase 2: Match/Create Stages ---
  matchItemsRecursively(
    incomingGrid.stages,
    existing.existingGridConfig.stages,
    undefined,
    undefined,
    stageIdMap,
    newStages,
    allStages,
  )

  // --- Phase 3: Merge Custom Categories ---
  for (const incomingCat of incomingCategories) {
    const existingCat = allCategories.find(
      (c) => c.path === incomingCat.path
    )
    if (existingCat) {
      categoryNumberMap.set(incomingCat.number, existingCat.number)
    } else {
      // Derive parent number for hierarchical numbering
      const mergeParts = incomingCat.path.split('/')
      let mergeParentNumber: string | undefined
      if (mergeParts.length > 1) {
        const mergeParentPath = mergeParts.slice(0, -1).join('/')
        mergeParentNumber = allCategories.find((c) => c.path === mergeParentPath)?.number
      }
      const newNumber = getNextCategoryNumber(allCategories, mergeParentNumber)
      categoryNumberMap.set(incomingCat.number, newNumber)
      const newCat: CategoryDefinition = {
        path: incomingCat.path,
        number: newNumber,
        order: allCategories.length,
      }
      newCategories.push(newCat)
      allCategories.push(newCat)
    }
  }

  // --- Phase 4: Remap Custom Node Types ---
  for (const incomingDef of incomingNodeTypes) {
    const slug = incomingDef.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const newType = `custom.${slug}-${crypto.randomUUID().slice(0, 8)}`
    nodeTypeMap.set(incomingDef.type, newType)

    const newCatNumber = categoryNumberMap.get(incomingDef.categoryNumber ?? '') ?? incomingDef.categoryNumber
    const newNodeNumber = newCatNumber ? getNextNodeNumber(newCatNumber, allNodeTypes) : undefined

    const newDef: NodeDefinition = {
      ...incomingDef,
      type: newType,
      categoryNumber: newCatNumber,
      number: newNodeNumber,
      isCustom: true,
      customizable: true,
    }
    newNodeTypes.push(newDef)
    allNodeTypes.push(newDef)
  }

  // --- Phase 5: Remap Nodes ---
  // Sort: parent (group) nodes first so parentId remapping works
  const sortedNodes = [...incoming.nodes].sort((a, b) => {
    const aHasParent = a.data?.parentId ? 1 : 0
    const bHasParent = b.data?.parentId ? 1 : 0
    return aHasParent - bHasParent
  })

  for (const incomingNode of sortedNodes) {
    const newId = crypto.randomUUID()
    nodeIdMap.set(incomingNode.id, newId)

    // Remap type (custom types get new type strings; built-in types stay)
    const oldType = incomingNode.type ?? ''
    const newType = nodeTypeMap.get(oldType) ?? oldType

    // Remap lane/stage IDs
    const oldLaneId = incomingNode.data?.laneId as string | undefined
    const oldStageId = incomingNode.data?.stageId as string | undefined
    const newLaneId = oldLaneId ? laneIdMap.get(oldLaneId) ?? oldLaneId : undefined
    const newStageId = oldStageId ? stageIdMap.get(oldStageId) ?? oldStageId : undefined

    // Remap parentId (group node reference)
    const oldParentId = incomingNode.data?.parentId as string | undefined
    const newParentId = oldParentId ? nodeIdMap.get(oldParentId) ?? oldParentId : undefined

    const newNode: WorkflowNode = {
      ...incomingNode,
      id: newId,
      type: newType,
      data: {
        ...incomingNode.data,
        definitionType: newType,
        laneId: newLaneId,
        stageId: newStageId,
        parentId: newParentId,
      },
    }
    newNodes.push(newNode)
  }

  // --- Phase 6: Remap Edges ---
  for (const incomingEdge of incoming.edges) {
    const newSource = nodeIdMap.get(incomingEdge.source)
    const newTarget = nodeIdMap.get(incomingEdge.target)

    // Skip edges that reference nodes not in the import
    if (!newSource || !newTarget) continue

    const edgeNumber = getNextEdgeNumber(allEdges)

    // Remap subSteps
    let newSubSteps: EdgeSubStep[] | undefined
    if (incomingEdge.data?.subSteps) {
      newSubSteps = incomingEdge.data.subSteps.map((step) => ({
        ...step,
        id: crypto.randomUUID(),
        nodeId: step.nodeId ? nodeIdMap.get(step.nodeId) ?? undefined : undefined,
      }))
    }

    const newEdgeId = `reactflow__edge-${newSource}${incomingEdge.sourceHandle ?? ''}-${newTarget}${incomingEdge.targetHandle ?? ''}`

    const displayLabel = incomingEdge.data?.label || edgeNumber

    const newEdge: WorkflowEdge = {
      ...incomingEdge,
      id: newEdgeId,
      source: newSource,
      target: newTarget,
      label: displayLabel,
      data: {
        ...incomingEdge.data,
        number: edgeNumber,
        subSteps: newSubSteps,
      },
    }
    newEdges.push(newEdge)
    allEdges.push(newEdge)
  }

  // --- Phase 7: Remap Placements ---
  for (const placement of incomingGrid.placements) {
    const newNodeId = nodeIdMap.get(placement.nodeId)
    const newLaneId = laneIdMap.get(placement.laneId)
    const newStageId = stageIdMap.get(placement.stageId)

    if (!newNodeId || !newLaneId || !newStageId) continue

    newPlacements.push({
      nodeId: newNodeId,
      laneId: newLaneId,
      stageId: newStageId,
    })
  }

  return {
    newNodes,
    newEdges,
    newLanes,
    newStages,
    newPlacements,
    newCategories,
    newNodeTypes,
  }
}

/**
 * Extracts selected nodes and their inter-edges into a mini Workflow object
 * suitable for pasting via mergeWorkflow.
 */
export function buildClipboardWorkflow(
  selectedNodeIds: Set<string>,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  gridConfig: GridConfig,
  customNodeTypes: NodeDefinition[],
  customCategories: CategoryDefinition[],
): Workflow {
  const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id))

  // Only include edges where BOTH source and target are selected
  const selectedEdges = edges.filter(
    (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
  )

  // Gather placements for selected nodes
  const selectedPlacements = gridConfig.placements.filter(
    (p) => selectedNodeIds.has(p.nodeId)
  )

  // Gather lane and stage IDs from placements (including parents for hierarchy)
  const neededLaneIds = new Set(selectedPlacements.map((p) => p.laneId))
  const neededStageIds = new Set(selectedPlacements.map((p) => p.stageId))

  // Walk up parent chains
  const allNeededLaneIds = new Set(neededLaneIds)
  for (const laneId of neededLaneIds) {
    let current = gridConfig.lanes.find((l) => l.id === laneId)
    while (current?.parentId) {
      allNeededLaneIds.add(current.parentId)
      current = gridConfig.lanes.find((l) => l.id === current!.parentId)
    }
  }
  const allNeededStageIds = new Set(neededStageIds)
  for (const stageId of neededStageIds) {
    let current = gridConfig.stages.find((s) => s.id === stageId)
    while (current?.parentId) {
      allNeededStageIds.add(current.parentId)
      current = gridConfig.stages.find((s) => s.id === current!.parentId)
    }
  }

  const relevantLanes = gridConfig.lanes.filter((l) => allNeededLaneIds.has(l.id))
  const relevantStages = gridConfig.stages.filter((s) => allNeededStageIds.has(s.id))

  // Gather relevant custom node types
  const nodeTypes = new Set(selectedNodes.map((n) => n.type).filter(Boolean))
  const relevantCustomTypes = customNodeTypes.filter(
    (d) => nodeTypes.has(d.type)
  )
  const relevantCategoryPaths = new Set(relevantCustomTypes.map((d) => d.category))
  const relevantCategories = customCategories.filter(
    (c) => relevantCategoryPaths.has(c.path)
  )

  return {
    metadata: {
      id: crypto.randomUUID(),
      name: 'Clipboard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    },
    nodes: selectedNodes,
    edges: selectedEdges,
    gridConfig: {
      lanes: relevantLanes,
      stages: relevantStages,
      placements: selectedPlacements,
    },
    customNodeTypes: relevantCustomTypes.length > 0 ? relevantCustomTypes : undefined,
    customCategories: relevantCategories.length > 0 ? relevantCategories : undefined,
  }
}
