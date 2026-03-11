import { create } from 'zustand'
import {
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
  EdgeSubStep,
  Workflow,
  WorkflowMetadata,
  GridConfig,
  LaneDefinition,
  StageDefinition,
  NodeDefinition,
  CategoryDefinition,
  ConfigFieldDefinition,
} from '@/types/index.ts'
import { nodeRegistry } from '@/registry/index.ts'
import {
  getNextCategoryNumber,
  getNextNodeNumber,
  getNextEdgeNumber,
} from '@/utils/numbering.ts'
import { mergeWorkflow, buildClipboardWorkflow } from '@/utils/mergeWorkflow.ts'

interface HistoryEntry {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  gridConfig: GridConfig
}

const MAX_HISTORY = 50
const MAX_RECENT = 3
const RECENT_STORAGE_KEY = 'workflow-recent-saves'

const EMPTY_GRID: GridConfig = { lanes: [], stages: [], placements: [] }

// --- Recent saves (localStorage) ---

function getRecentSaves(): Workflow[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function pushRecentSave(workflow: Workflow) {
  const existing = getRecentSaves()
  const filtered = existing.filter((w) => w.metadata.id !== workflow.metadata.id)
  filtered.unshift(workflow)
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)))
}

function createEmptyMetadata(): WorkflowMetadata {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Workflow',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }
}

export interface WorkflowState {
  // Data
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  metadata: WorkflowMetadata
  selectedNodeId: string | null
  isCreatingConnection: boolean
  setIsCreatingConnection: (isCreating: boolean) => void

  // View mode
  viewMode: 'canvas' | 'grid'
  setViewMode: (mode: 'canvas' | 'grid') => void

  // Dark mode
  darkMode: boolean
  toggleDarkMode: () => void

  // Panel collapse
  palettCollapsed: boolean
  propertiesCollapsed: boolean
  togglePalette: () => void
  toggleProperties: () => void

  // Grid configuration
  gridConfig: GridConfig
  addLane: (lane: Omit<LaneDefinition, 'id'>) => void
  removeLane: (id: string) => void
  updateLane: (id: string, updates: Partial<LaneDefinition>) => void
  addStage: (stage: Omit<StageDefinition, 'id'>) => void
  removeStage: (id: string) => void
  updateStage: (id: string, updates: Partial<StageDefinition>) => void
  insertLane: (lane: Omit<LaneDefinition, 'id'>, referenceId: string, position: 'before' | 'after') => void
  insertStage: (stage: Omit<StageDefinition, 'id'>, referenceId: string, position: 'before' | 'after') => void
  reorderLanes: (sourceId: string, targetId: string) => void
  reorderStages: (sourceId: string, targetId: string) => void
  setLaneColumnWidth: (width: number) => void
  placeNode: (nodeId: string, laneId: string, stageId: string) => void
  unplaceNode: (nodeId: string) => void

  // Custom categories and node types (user-created)
  customCategories: CategoryDefinition[]
  customNodeTypes: NodeDefinition[]
  registryVersion: number
  addCustomCategory: (path: string) => void
  removeCustomCategory: (path: string) => void
  renameCustomCategory: (oldPath: string, newPath: string) => void
  cloneNodeDefinition: (sourceType: string, targetCategory?: string) => string | null
  updateCustomNodeDefinition: (type: string, updates: Partial<Pick<NodeDefinition, 'label' | 'description' | 'icon' | 'category' | 'inputs' | 'outputs' | 'configSchema' | 'defaultConfig'>>) => void
  moveCustomNodeToCategory: (type: string, newCategory: string) => void
  addPortToCustomNode: (type: string, portType: 'input' | 'output', port: { name: string; type: string; label: string; multiple?: boolean }) => void
  removePortFromCustomNode: (type: string, portType: 'input' | 'output', portName: string) => void
  updatePortOnCustomNode: (type: string, portType: 'input' | 'output', portName: string, updates: { name?: string; type?: string; label?: string; multiple?: boolean }) => void
  addConfigFieldToCustomNode: (type: string, field: { key: string; label: string; type: string; defaultValue?: unknown; options?: Array<{ label: string; value: string }> }) => void
  removeConfigFieldFromCustomNode: (type: string, fieldKey: string) => void
  updateConfigFieldOnCustomNode: (type: string, fieldKey: string, updates: { key?: string; label?: string; type?: string; defaultValue?: unknown; options?: Array<{ label: string; value: string }> }) => void
  addCustomNodeType: (input: {
    label: string
    category: string
    description?: string
    icon?: string
    baseType: 'process' | 'decision' | 'start' | 'output'
  }) => void
  updateCustomNodeType: (type: string, updates: {
    label?: string
    description?: string
    icon?: string
    baseType?: 'process' | 'decision' | 'start' | 'output'
    category?: string
  }) => void
  removeCustomNodeType: (type: string) => void
  renumberAll: () => void

  // Grid seeding
  seedGrid: (rows: number, cols: number) => void

  // Sync grid placement → canvas positions
  syncGridToCanvas: () => void

  // Undo/redo
  history: HistoryEntry[]
  historyIndex: number

  // React Flow event handlers
  onNodesChange: OnNodesChange<WorkflowNode>
  onEdgesChange: OnEdgesChange<WorkflowEdge>
  onConnect: OnConnect

  // Node operations
  addNode: (definitionType: string, position: { x: number; y: number }) => void
  removeNode: (id: string) => void
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void
  selectNode: (id: string | null) => void

  // Edge operations
  addEdge: (params: {
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
  }) => void
  removeEdge: (id: string) => void
  selectEdge: (id: string | null) => void
  selectedEdgeId: string | null
  updateEdge: (
    id: string,
    data: Partial<{ label: string; description: string; properties: Record<string, unknown>; subSteps: EdgeSubStep[] }>
  ) => void

  // Edge expand/collapse (view-only state, not in undo/redo)
  expandedEdgeIds: Set<string>
  toggleEdgeExpand: (id: string) => void

  // Workflow operations
  loadWorkflow: (workflow: Workflow) => void
  getWorkflow: () => Workflow
  updateMetadata: (metadata: Partial<WorkflowMetadata>) => void
  clear: () => void

  // Recent saves
  saveToRecent: () => void
  getRecentSaves: () => Workflow[]

  // Undo/redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Import/merge
  importWorkflow: (workflow: Workflow, targetCell?: { laneId: string; stageId: string }) => void

  // Multi-select & clipboard
  selectedNodeIds: Set<string>
  toggleNodeSelection: (id: string) => void
  selectMultipleNodes: (ids: string[]) => void
  clearNodeSelection: () => void
  clipboard: Workflow | null
  copySelectedNodes: () => void
  pasteNodes: () => void

  // Paste target cell
  pasteTargetCell: { laneId: string; stageId: string } | null
  setPasteTargetCell: (cell: { laneId: string; stageId: string } | null) => void

  // Batch move / duplicate
  placeNodes: (moves: Array<{ nodeId: string; laneId: string; stageId: string }>) => void
  duplicateNodesToCell: (nodeIds: string[], laneId: string, stageId: string) => void
}

function pushHistory(state: {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  gridConfig: GridConfig
  history: HistoryEntry[]
  historyIndex: number
}) {
  const entry: HistoryEntry = {
    nodes: structuredClone(state.nodes),
    edges: structuredClone(state.edges),
    gridConfig: structuredClone(state.gridConfig),
  }
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  newHistory.push(entry)
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift()
  }
  return { history: newHistory, historyIndex: newHistory.length - 1 }
}


/**
 * Returns leaf item IDs in display order (DFS walk of hierarchy).
 * Works for both lanes and stages.
 */
function getOrderedLeafIds(items: Array<{ id: string; parentId?: string; order: number }>): string[] {
  const childrenMap = new Map<string | undefined, typeof items>()
  for (const item of items) {
    const parentKey = item.parentId ?? undefined
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, [])
    childrenMap.get(parentKey)!.push(item)
  }
  for (const [, children] of childrenMap) {
    children.sort((a, b) => a.order - b.order)
  }
  const hasChildrenSet = new Set<string>()
  for (const item of items) {
    if (item.parentId) hasChildrenSet.add(item.parentId)
  }
  const result: string[] = []
  function walk(parentId: string | undefined) {
    const children = childrenMap.get(parentId) ?? []
    for (const child of children) {
      if (hasChildrenSet.has(child.id)) {
        walk(child.id)
      } else {
        result.push(child.id)
      }
    }
  }
  walk(undefined)
  return result
}

function baseTypeToPorts(baseType: string): { inputs: NodeDefinition['inputs']; outputs: NodeDefinition['outputs'] } {
  switch (baseType) {
    case 'decision':
      return {
        inputs: [{ name: 'in', type: 'document', label: 'In' }],
        outputs: [
          { name: 'yes', type: 'document', label: 'Yes' },
          { name: 'no', type: 'document', label: 'No' },
        ],
      }
    case 'start':
      return {
        inputs: [{ name: 'trigger', type: 'flow', label: 'Trigger' }],
        outputs: [{ name: 'out', type: 'flow', label: 'Start' }],
      }
    case 'output':
      return {
        inputs: [{ name: 'in', type: 'document', label: 'In' }],
        outputs: [{ name: 'result', type: 'document', label: 'Result' }],
      }
    case 'end':
      return {
        inputs: [{ name: 'in', type: 'flow', label: 'In' }],
        outputs: [{ name: 'done', type: 'flow', label: 'Done' }],
      }
    case 'subprocess':
      return {
        inputs: [{ name: 'in', type: 'document', label: 'In' }],
        outputs: [{ name: 'out', type: 'document', label: 'Out' }],
      }
    case 'document':
      return {
        inputs: [{ name: 'in', type: 'document', label: 'In' }],
        outputs: [{ name: 'out', type: 'document', label: 'Out' }],
      }
    case 'process':
    default:
      return {
        inputs: [{ name: 'in', type: 'document', label: 'In' }],
        outputs: [{ name: 'out', type: 'document', label: 'Out' }],
      }
  }
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  metadata: createEmptyMetadata(),
  selectedNodeId: null,
  selectedEdgeId: null,
  expandedEdgeIds: new Set<string>(),
  isCreatingConnection: false,
  viewMode: 'grid',
  darkMode: localStorage.getItem('darkMode') === 'true',
  palettCollapsed: false,
  propertiesCollapsed: false,
  gridConfig: { lanes: [], stages: [], placements: [] },
  customCategories: [],
  customNodeTypes: [],
  registryVersion: 0,
  history: [{ nodes: [], edges: [], gridConfig: EMPTY_GRID }],
  historyIndex: 0,
  selectedNodeIds: new Set<string>(),
  clipboard: null,
  pasteTargetCell: null,

  setIsCreatingConnection: (isCreating) => {
    set({ isCreatingConnection: isCreating })
  },

  toggleDarkMode: () => {
    const newDarkMode = !get().darkMode
    localStorage.setItem('darkMode', String(newDarkMode))
    set({ darkMode: newDarkMode })
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },

  togglePalette: () => set({ palettCollapsed: !get().palettCollapsed }),
  toggleProperties: () => set({ propertiesCollapsed: !get().propertiesCollapsed }),

  setViewMode: (mode) => {
    // When switching to canvas, auto-layout nodes based on grid placement
    if (mode === 'canvas') {
      get().syncGridToCanvas()
    }
    // Collapse all expanded edges when leaving canvas
    if (mode === 'grid') {
      set({ viewMode: mode, expandedEdgeIds: new Set<string>() })
    } else {
      set({ viewMode: mode })
    }
  },

  syncGridToCanvas: () => {
    const state = get()
    const { lanes, stages, placements } = state.gridConfig

    if (placements.length === 0) return

    // Only consider LEAF lanes and stages (no children) - actual cells where nodes are placed
    const laneChildren = new Map<string, string[]>()
    const stageChildren = new Map<string, string[]>()

    for (const l of lanes) {
      if (l.parentId) {
        if (!laneChildren.has(l.parentId)) laneChildren.set(l.parentId, [])
        laneChildren.get(l.parentId)!.push(l.id)
      }
    }

    for (const s of stages) {
      if (s.parentId) {
        if (!stageChildren.has(s.parentId)) stageChildren.set(s.parentId, [])
        stageChildren.get(s.parentId)!.push(s.id)
      }
    }

    const leafLanes = lanes.filter((l) => !laneChildren.has(l.id))
    const leafStages = stages.filter((s) => !stageChildren.has(s.id))

    // Build sorted index maps for leaf lanes and stages
    const sortedLanes = [...leafLanes].sort((a, b) => a.order - b.order)
    const sortedStages = [...leafStages].sort((a, b) => a.order - b.order)
    const laneIndex = new Map(sortedLanes.map((l, i) => [l.id, i]))
    const stageIndex = new Map(sortedStages.map((s, i) => [s.id, i]))

    // Count how many nodes share each cell for vertical stacking
    const cellCounts = new Map<string, number>()
    const cellNodeIndex = new Map<string, number>()
    for (const p of placements) {
      const key = `${p.laneId}:${p.stageId}`
      cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1)
    }

    const STAGE_SPACING = 300
    const LANE_SPACING = 200
    const NODE_STACK_OFFSET = 80
    const PADDING_X = 100
    const PADDING_Y = 80

    const newNodes = state.nodes.map((node) => {
      const placement = placements.find((p) => p.nodeId === node.id)
      if (!placement) return node

      const si = stageIndex.get(placement.stageId) ?? 0
      const li = laneIndex.get(placement.laneId) ?? 0

      // Stack offset for multiple nodes in same cell
      const cellKey = `${placement.laneId}:${placement.stageId}`
      const idx = cellNodeIndex.get(cellKey) ?? 0
      cellNodeIndex.set(cellKey, idx + 1)

      return {
        ...node,
        position: {
          x: PADDING_X + si * STAGE_SPACING,
          y: PADDING_Y + li * LANE_SPACING + idx * NODE_STACK_OFFSET,
        },
      }
    })

    set({ nodes: newNodes })
  },

  // --- Custom categories & node types ---

  addCustomCategory: (path) => {
    const state = get()
    // Check if category already exists
    if (state.customCategories.some((c) => c.path === path)) {
      return
    }

    // Auto-assign category number
    const number = getNextCategoryNumber(state.customCategories)
    const order = state.customCategories.length

    const newCategory: CategoryDefinition = {
      path,
      number,
      order,
    }

    set({
      customCategories: [...state.customCategories, newCategory],
      registryVersion: state.registryVersion + 1,
    })
  },

  removeCustomCategory: (path) => {
    const state = get()
    // Remove category and all custom nodes in it
    const typesToRemove = state.customNodeTypes
      .filter((d) => d.category === path)
      .map((d) => d.type)
    for (const t of typesToRemove) nodeRegistry.unregister(t)
    set({
      customCategories: state.customCategories.filter((c) => c.path !== path),
      customNodeTypes: state.customNodeTypes.filter((d) => d.category !== path),
      registryVersion: state.registryVersion + 1,
    })
  },

  renameCustomCategory: (oldPath, newPath) => {
    const state = get()
    const updatedTypes = state.customNodeTypes.map((d) => {
      if (d.category === oldPath) {
        const updated = { ...d, category: newPath }
        nodeRegistry.register(updated)
        return updated
      }
      return d
    })
    set({
      customCategories: state.customCategories.map((c) =>
        c.path === oldPath ? { ...c, path: newPath } : c
      ),
      customNodeTypes: updatedTypes,
      registryVersion: state.registryVersion + 1,
    })
  },

  cloneNodeDefinition: (sourceType, targetCategory) => {
    const state = get()
    const sourceDef = nodeRegistry.get(sourceType)
    if (!sourceDef) {
      console.error(`Cannot clone: Node definition "${sourceType}" not found in registry`)
      return null
    }

    // Determine target category (use provided or default to "My Nodes")
    const category = targetCategory ?? "My Nodes"

    // Find or create category
    let categoryDef = state.customCategories.find((c) => c.path === category)
    if (!categoryDef) {
      // Auto-create category if it doesn't exist
      const number = getNextCategoryNumber(state.customCategories)
      categoryDef = {
        path: category,
        number,
        order: state.customCategories.length,
      }
      state.customCategories.push(categoryDef)
    }

    // Generate unique type ID
    const slug = sourceDef.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const type = `custom.${slug}-${crypto.randomUUID().slice(0, 8)}`

    // Auto-assign node number
    const nodeNumber = getNextNodeNumber(categoryDef.number, state.customNodeTypes)

    // Clone the definition
    const clonedDef: NodeDefinition = {
      ...sourceDef,
      type,
      category,
      sourceTemplateType: sourceType,
      isCustom: true,
      customizable: true,
      number: nodeNumber,
      categoryNumber: categoryDef.number,
    }

    // Register in registry
    nodeRegistry.register(clonedDef)

    // Update state
    set({
      customCategories: categoryDef ? [...state.customCategories] : state.customCategories,
      customNodeTypes: [...state.customNodeTypes, clonedDef],
      registryVersion: state.registryVersion + 1,
    })

    return type
  },

  updateCustomNodeDefinition: (type, updates) => {
    const state = get()

    // Find the custom node definition
    const nodeDefIndex = state.customNodeTypes.findIndex((d) => d.type === type)
    if (nodeDefIndex === -1) {
      console.error(`Cannot update: Node definition "${type}" not found`)
      return
    }

    const oldDef = state.customNodeTypes[nodeDefIndex]
    let updatedDef = { ...oldDef, ...updates }
    let categoryDef = undefined

    // If category changed, re-number the node
    if (updates.category && updates.category !== oldDef.category) {
      // Find or create target category
      categoryDef = state.customCategories.find((c) => c.path === updates.category)
      if (!categoryDef) {
        const number = getNextCategoryNumber(state.customCategories)
        categoryDef = {
          path: updates.category,
          number,
          order: state.customCategories.length,
        }
        state.customCategories.push(categoryDef)
      }

      // Re-number the node for new category
      const nodeNumber = getNextNodeNumber(categoryDef.number, state.customNodeTypes)
      updatedDef = {
        ...updatedDef,
        number: nodeNumber,
        categoryNumber: categoryDef.number,
      }
    }

    // Re-register in nodeRegistry
    nodeRegistry.register(updatedDef)

    // Update in customNodeTypes array
    const updatedTypes = [...state.customNodeTypes]
    updatedTypes[nodeDefIndex] = updatedDef

    // Sync existing node instances
    let newNodes = state.nodes.map((node) => {
      if (node.type !== type) return node

      // Update instance label if it matches old definition label
      if (updates.label && oldDef.label !== updates.label && node.data.label === oldDef.label) {
        return { ...node, data: { ...node.data, label: updates.label, _version: state.registryVersion + 1 } }
      }

      // Force re-render by adding version to break React Flow's equality check
      return { ...node, data: { ...node.data, _version: state.registryVersion + 1 } }
    })

    set({
      nodes: newNodes,
      customCategories: categoryDef ? [...state.customCategories] : state.customCategories,
      customNodeTypes: updatedTypes,
      registryVersion: state.registryVersion + 1,
    })
  },

  moveCustomNodeToCategory: (type, newCategory) => {
    get().updateCustomNodeDefinition(type, { category: newCategory })
  },

  addPortToCustomNode: (type, portType, port) => {
    const state = get()
    const nodeDefIndex = state.customNodeTypes.findIndex((d) => d.type === type)
    if (nodeDefIndex === -1) {
      console.error(`Cannot add port: Node definition "${type}" not found`)
      return
    }

    const oldDef = state.customNodeTypes[nodeDefIndex]
    const portArray = portType === 'input' ? oldDef.inputs : oldDef.outputs

    // Check for duplicate port names
    if (portArray.some((p) => p.name === port.name)) {
      console.error(`Port "${port.name}" already exists on ${portType}s`)
      return
    }

    const updatedDef = {
      ...oldDef,
      [portType === 'input' ? 'inputs' : 'outputs']: [...portArray, port],
    }

    nodeRegistry.register(updatedDef)

    const updatedTypes = [...state.customNodeTypes]
    updatedTypes[nodeDefIndex] = updatedDef

    set({
      customNodeTypes: updatedTypes,
      registryVersion: state.registryVersion + 1,
    })
  },

  removePortFromCustomNode: (type, portType, portName) => {
    const state = get()
    const nodeDefIndex = state.customNodeTypes.findIndex((d) => d.type === type)
    if (nodeDefIndex === -1) {
      console.error(`Cannot remove port: Node definition "${type}" not found`)
      return
    }

    const oldDef = state.customNodeTypes[nodeDefIndex]
    const portArray = portType === 'input' ? oldDef.inputs : oldDef.outputs

    const updatedDef = {
      ...oldDef,
      [portType === 'input' ? 'inputs' : 'outputs']: portArray.filter((p) => p.name !== portName),
    }

    nodeRegistry.register(updatedDef)

    const updatedTypes = [...state.customNodeTypes]
    updatedTypes[nodeDefIndex] = updatedDef

    set({
      customNodeTypes: updatedTypes,
      registryVersion: state.registryVersion + 1,
    })
  },

  updatePortOnCustomNode: (type, portType, portName, updates) => {
    const state = get()
    const nodeDefIndex = state.customNodeTypes.findIndex((d) => d.type === type)
    if (nodeDefIndex === -1) {
      console.error(`Cannot update port: Node definition "${type}" not found`)
      return
    }

    const oldDef = state.customNodeTypes[nodeDefIndex]
    const portArray = portType === 'input' ? oldDef.inputs : oldDef.outputs

    // Check if renaming would create a duplicate
    if (updates.name && updates.name !== portName) {
      if (portArray.some((p) => p.name === updates.name)) {
        console.error(`Port "${updates.name}" already exists on ${portType}s`)
        return
      }
    }

    const updatedPorts = portArray.map((p) =>
      p.name === portName ? { ...p, ...updates } : p
    )

    const updatedDef = {
      ...oldDef,
      [portType === 'input' ? 'inputs' : 'outputs']: updatedPorts,
    }

    nodeRegistry.register(updatedDef)

    const updatedTypes = [...state.customNodeTypes]
    updatedTypes[nodeDefIndex] = updatedDef

    set({
      customNodeTypes: updatedTypes,
      registryVersion: state.registryVersion + 1,
    })
  },

  addConfigFieldToCustomNode: (type, field) => {
    const state = get()
    const nodeDefIndex = state.customNodeTypes.findIndex((d) => d.type === type)
    if (nodeDefIndex === -1) {
      console.error(`Cannot add config field: Node definition "${type}" not found`)
      return
    }

    const oldDef = state.customNodeTypes[nodeDefIndex]
    const configSchema = oldDef.configSchema ?? []

    // Check for duplicate field keys
    if (configSchema.some((f) => f.key === field.key)) {
      console.error(`Config field "${field.key}" already exists`)
      return
    }

    const updatedDef = {
      ...oldDef,
      configSchema: [...configSchema, field] as ConfigFieldDefinition[],
    }

    nodeRegistry.register(updatedDef)

    const updatedTypes = [...state.customNodeTypes]
    updatedTypes[nodeDefIndex] = updatedDef

    set({
      customNodeTypes: updatedTypes,
      registryVersion: state.registryVersion + 1,
    })
  },

  removeConfigFieldFromCustomNode: (type, fieldKey) => {
    const state = get()
    const nodeDefIndex = state.customNodeTypes.findIndex((d) => d.type === type)
    if (nodeDefIndex === -1) {
      console.error(`Cannot remove config field: Node definition "${type}" not found`)
      return
    }

    const oldDef = state.customNodeTypes[nodeDefIndex]
    const configSchema = oldDef.configSchema ?? []

    const updatedDef = {
      ...oldDef,
      configSchema: configSchema.filter((f) => f.key !== fieldKey),
    }

    nodeRegistry.register(updatedDef)

    const updatedTypes = [...state.customNodeTypes]
    updatedTypes[nodeDefIndex] = updatedDef

    set({
      customNodeTypes: updatedTypes,
      registryVersion: state.registryVersion + 1,
    })
  },

  updateConfigFieldOnCustomNode: (type, fieldKey, updates) => {
    const state = get()
    const nodeDefIndex = state.customNodeTypes.findIndex((d) => d.type === type)
    if (nodeDefIndex === -1) {
      console.error(`Cannot update config field: Node definition "${type}" not found`)
      return
    }

    const oldDef = state.customNodeTypes[nodeDefIndex]
    const configSchema = oldDef.configSchema ?? []

    // Check if renaming would create a duplicate
    if (updates.key && updates.key !== fieldKey) {
      if (configSchema.some((f) => f.key === updates.key)) {
        console.error(`Config field "${updates.key}" already exists`)
        return
      }
    }

    const updatedFields = configSchema.map((f) =>
      f.key === fieldKey ? { ...f, ...updates } : f
    )

    const updatedDef = {
      ...oldDef,
      configSchema: updatedFields as ConfigFieldDefinition[],
    }

    nodeRegistry.register(updatedDef)

    const updatedTypes = [...state.customNodeTypes]
    updatedTypes[nodeDefIndex] = updatedDef

    set({
      customNodeTypes: updatedTypes,
      registryVersion: state.registryVersion + 1,
    })
  },

  addCustomNodeType: (input) => {
    const state = get()
    const slug = input.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const type = `custom.${slug}-${crypto.randomUUID().slice(0, 8)}`
    const ports = baseTypeToPorts(input.baseType)

    // Find or create category to assign number
    let categoryDef = state.customCategories.find((c) => c.path === input.category)
    let updatedCategories = state.customCategories
    if (!categoryDef) {
      const number = getNextCategoryNumber(state.customCategories)
      categoryDef = { path: input.category, number, order: state.customCategories.length }
      updatedCategories = [...state.customCategories, categoryDef]
    }
    const nodeNumber = getNextNodeNumber(categoryDef.number, state.customNodeTypes)

    const def: NodeDefinition = {
      type,
      label: input.label,
      category: input.category,
      description: input.description ?? '',
      icon: input.icon || '\u{1F4E6}',
      color: 'bg-slate-600',
      inputs: ports.inputs,
      outputs: ports.outputs,
      configSchema: [],
      defaultConfig: {},
      flowType: input.baseType as NodeDefinition['flowType'],
      customizable: true,
      isCustom: true,
      number: nodeNumber,
      categoryNumber: categoryDef.number,
    }
    nodeRegistry.register(def)
    set({
      customCategories: updatedCategories,
      customNodeTypes: [...state.customNodeTypes, def],
      registryVersion: state.registryVersion + 1,
    })
  },

  updateCustomNodeType: (type, updates) => {
    const state = get()
    const updatedTypes = state.customNodeTypes.map((d) => {
      if (d.type !== type) return d
      const updated = { ...d }
      if (updates.label !== undefined) updated.label = updates.label
      if (updates.description !== undefined) updated.description = updates.description
      if (updates.icon !== undefined) updated.icon = updates.icon
      if (updates.baseType !== undefined) {
        const ports = baseTypeToPorts(updates.baseType)
        updated.inputs = ports.inputs
        updated.outputs = ports.outputs
      }
      if (updates.category !== undefined && updates.category !== d.category) {
        updated.category = updates.category
        // Re-assign categoryNumber and node number for the new category
        const targetCat = state.customCategories.find((c) => c.path === updates.category)
        if (targetCat) {
          updated.categoryNumber = targetCat.number
          updated.number = getNextNodeNumber(targetCat.number, state.customNodeTypes.filter((n) => n.type !== type))
        }
      }
      nodeRegistry.register(updated)
      return updated
    })
    set({
      customNodeTypes: updatedTypes,
      registryVersion: state.registryVersion + 1,
    })
  },

  removeCustomNodeType: (type) => {
    const state = get()
    nodeRegistry.unregister(type)
    set({
      customNodeTypes: state.customNodeTypes.filter((d) => d.type !== type),
      registryVersion: state.registryVersion + 1,
    })
  },

  renumberAll: () => {
    const state = get()
    // Collect ALL unique category paths from both customCategories and node definitions
    const allPaths = new Set<string>()
    for (const cat of state.customCategories) allPaths.add(cat.path)
    for (const def of state.customNodeTypes) {
      if (def.category) allPaths.add(def.category)
    }
    // Build complete category list, sorted alphabetically, numbered sequentially
    const sortedPaths = [...allPaths].sort((a, b) => a.localeCompare(b))
    const renumberedCats: CategoryDefinition[] = sortedPaths.map((path, i) => {
      const existing = state.customCategories.find((c) => c.path === path)
      return { path, number: `C${i + 1}`, order: i, ...(existing ? {} : {}) }
    })
    // Re-number all nodes within each category: C1-001, C1-002, ...
    const counters = new Map<string, number>()
    const renumberedNodes = state.customNodeTypes.map((def) => {
      const catDef = renumberedCats.find((c) => c.path === def.category)
      if (!catDef) return def
      const count = (counters.get(catDef.number) ?? 0) + 1
      counters.set(catDef.number, count)
      const updated = {
        ...def,
        categoryNumber: catDef.number,
        number: `${catDef.number}-${count.toString().padStart(3, '0')}`,
      }
      nodeRegistry.register(updated)
      return updated
    })
    set({
      customCategories: renumberedCats,
      customNodeTypes: renumberedNodes,
      registryVersion: state.registryVersion + 1,
    })
  },

  // --- Grid seeding ---

  seedGrid: (rows, cols) => {
    const state = get()
    const lanes = Array.from({ length: rows }, (_, i) => ({
      id: crypto.randomUUID(),
      label: `Lane ${i + 1}`,
      order: i + 1,
    }))
    const stages = Array.from({ length: cols }, (_, i) => ({
      id: crypto.randomUUID(),
      label: `Stage ${i + 1}`,
      order: i + 1,
    }))
    const newGridConfig = { lanes, stages, placements: [] }
    set({
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, gridConfig: newGridConfig }),
    })
  },

  // --- Grid operations ---

  addLane: (lane) => {
    const state = get()
    const newLane: LaneDefinition = { ...lane, id: crypto.randomUUID() }

    // If adding a sub-lane to a parent that has no children yet,
    // migrate parent's placements to the new sub-lane
    if (lane.parentId) {
      const existingChildren = state.gridConfig.lanes.filter((l) => l.parentId === lane.parentId)
      if (existingChildren.length === 0) {
        const newPlacements = state.gridConfig.placements.map((p) =>
          p.laneId === lane.parentId ? { ...p, laneId: newLane.id } : p,
        )
        const newNodes = state.nodes.map((node) =>
          node.data.laneId === lane.parentId
            ? { ...node, data: { ...node.data, laneId: newLane.id } }
            : node,
        )
        const newGridConfig = {
          ...state.gridConfig,
          lanes: [...state.gridConfig.lanes, newLane],
          placements: newPlacements,
        }
        set({
          nodes: newNodes,
          gridConfig: newGridConfig,
          ...pushHistory({ ...state, nodes: newNodes, gridConfig: newGridConfig }),
        })
        return
      }
    }

    const newGridConfig = {
      ...state.gridConfig,
      lanes: [...state.gridConfig.lanes, newLane],
    }
    set({
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, gridConfig: newGridConfig }),
    })
  },

  removeLane: (id) => {
    const state = get()
    // Collect this lane and all descendant lanes
    const idsToRemove = new Set<string>([id])
    let changed = true
    while (changed) {
      changed = false
      for (const lane of state.gridConfig.lanes) {
        if (lane.parentId && idsToRemove.has(lane.parentId) && !idsToRemove.has(lane.id)) {
          idsToRemove.add(lane.id)
          changed = true
        }
      }
    }
    const newGridConfig = {
      ...state.gridConfig,
      lanes: state.gridConfig.lanes.filter((l) => !idsToRemove.has(l.id)),
      placements: state.gridConfig.placements.filter((p) => !idsToRemove.has(p.laneId)),
    }
    set({
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, gridConfig: newGridConfig }),
    })
  },

  updateLane: (id, updates) => {
    const state = get()
    const newGridConfig = {
      ...state.gridConfig,
      lanes: state.gridConfig.lanes.map((l) =>
        l.id === id ? { ...l, ...updates } : l,
      ),
    }
    set({
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, gridConfig: newGridConfig }),
    })
  },

  addStage: (stage) => {
    const state = get()
    const newStage: StageDefinition = { ...stage, id: crypto.randomUUID() }

    // If adding a sub-stage to a parent that has no children yet,
    // migrate parent's placements to the new sub-stage
    if (stage.parentId) {
      const existingChildren = state.gridConfig.stages.filter((s) => s.parentId === stage.parentId)
      if (existingChildren.length === 0) {
        const newPlacements = state.gridConfig.placements.map((p) =>
          p.stageId === stage.parentId ? { ...p, stageId: newStage.id } : p,
        )
        const newNodes = state.nodes.map((node) =>
          node.data.stageId === stage.parentId
            ? { ...node, data: { ...node.data, stageId: newStage.id } }
            : node,
        )
        const newGridConfig = {
          ...state.gridConfig,
          stages: [...state.gridConfig.stages, newStage],
          placements: newPlacements,
        }
        set({
          nodes: newNodes,
          gridConfig: newGridConfig,
          ...pushHistory({ ...state, nodes: newNodes, gridConfig: newGridConfig }),
        })
        return
      }
    }

    const newGridConfig = {
      ...state.gridConfig,
      stages: [...state.gridConfig.stages, newStage],
    }
    set({
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, gridConfig: newGridConfig }),
    })
  },

  insertLane: (lane, referenceId, position) => {
    const state = get()
    const ref = state.gridConfig.lanes.find((l) => l.id === referenceId)
    if (!ref) return
    const newLane: LaneDefinition = { ...lane, id: crypto.randomUUID(), parentId: ref.parentId }
    const insertOrder = position === 'before' ? ref.order : ref.order + 1
    const shiftedLanes = state.gridConfig.lanes.map((l) => {
      if (l.parentId !== ref.parentId) return l
      if (l.order >= insertOrder) return { ...l, order: l.order + 1 }
      return l
    })
    newLane.order = insertOrder
    const newGridConfig = { ...state.gridConfig, lanes: [...shiftedLanes, newLane] }
    set({ gridConfig: newGridConfig, ...pushHistory({ ...state, gridConfig: newGridConfig }) })
  },

  insertStage: (stage, referenceId, position) => {
    const state = get()
    const ref = state.gridConfig.stages.find((s) => s.id === referenceId)
    if (!ref) return
    const newStage: StageDefinition = { ...stage, id: crypto.randomUUID(), parentId: ref.parentId }
    const insertOrder = position === 'before' ? ref.order : ref.order + 1
    const shiftedStages = state.gridConfig.stages.map((s) => {
      if (s.parentId !== ref.parentId) return s
      if (s.order >= insertOrder) return { ...s, order: s.order + 1 }
      return s
    })
    newStage.order = insertOrder
    const newGridConfig = { ...state.gridConfig, stages: [...shiftedStages, newStage] }
    set({ gridConfig: newGridConfig, ...pushHistory({ ...state, gridConfig: newGridConfig }) })
  },

  removeStage: (id) => {
    const state = get()
    // Collect this stage and all descendant stages
    const idsToRemove = new Set<string>([id])
    let changed = true
    while (changed) {
      changed = false
      for (const stage of state.gridConfig.stages) {
        if (stage.parentId && idsToRemove.has(stage.parentId) && !idsToRemove.has(stage.id)) {
          idsToRemove.add(stage.id)
          changed = true
        }
      }
    }
    const newGridConfig = {
      ...state.gridConfig,
      stages: state.gridConfig.stages.filter((s) => !idsToRemove.has(s.id)),
      placements: state.gridConfig.placements.filter((p) => !idsToRemove.has(p.stageId)),
    }
    set({
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, gridConfig: newGridConfig }),
    })
  },

  updateStage: (id, updates) => {
    const state = get()
    const newGridConfig = {
      ...state.gridConfig,
      stages: state.gridConfig.stages.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    }
    set({
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, gridConfig: newGridConfig }),
    })
  },

  reorderLanes: (sourceId, targetId) => {
    if (sourceId === targetId) return
    const state = get()
    const sourceLane = state.gridConfig.lanes.find((l) => l.id === sourceId)
    const targetLane = state.gridConfig.lanes.find((l) => l.id === targetId)
    if (!sourceLane || !targetLane) return
    // Only swap siblings (same parent)
    if (sourceLane.parentId !== targetLane.parentId) return

    const newGridConfig = {
      ...state.gridConfig,
      lanes: state.gridConfig.lanes.map((l) => {
        if (l.id === sourceId) return { ...l, order: targetLane.order }
        if (l.id === targetId) return { ...l, order: sourceLane.order }
        return l
      }),
    }
    set({
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, gridConfig: newGridConfig }),
    })
  },

  reorderStages: (sourceId, targetId) => {
    if (sourceId === targetId) return
    const state = get()
    const sourceStage = state.gridConfig.stages.find((s) => s.id === sourceId)
    const targetStage = state.gridConfig.stages.find((s) => s.id === targetId)
    if (!sourceStage || !targetStage) return
    // Only swap siblings (same parent)
    if (sourceStage.parentId !== targetStage.parentId) return

    const newGridConfig = {
      ...state.gridConfig,
      stages: state.gridConfig.stages.map((s) => {
        if (s.id === sourceId) return { ...s, order: targetStage.order }
        if (s.id === targetId) return { ...s, order: sourceStage.order }
        return s
      }),
    }
    set({
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, gridConfig: newGridConfig }),
    })
  },

  setLaneColumnWidth: (width) => {
    const state = get()
    const newGridConfig = { ...state.gridConfig, laneColumnWidth: Math.max(80, width) }
    set({ gridConfig: newGridConfig })
  },

  placeNode: (nodeId, laneId, stageId) => {
    const state = get()

    // Check if node was already placed (moving between cells) vs first-time placement
    const wasAlreadyPlaced = state.gridConfig.placements.some((p) => p.nodeId === nodeId)

    // Update placement
    const filtered = state.gridConfig.placements.filter((p) => p.nodeId !== nodeId)
    const newGridConfig = {
      ...state.gridConfig,
      placements: [...filtered, { nodeId, laneId, stageId }],
    }
    // Also set laneId/stageId on node data
    const newNodes = state.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, laneId, stageId } }
        : node,
    )

    set({
      nodes: newNodes,
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, nodes: newNodes, gridConfig: newGridConfig }),
    })

    // Only auto-connect on FIRST placement (not when moving an existing node)
    // This prevents recreating edges the user intentionally deleted
    if (wasAlreadyPlaced) return

    // Auto-connect to adjacent-stage nodes in the same lane (left→right only)
    const { stages } = newGridConfig
    // Find leaf stages (no children) sorted by order
    const parentIds = new Set(stages.filter((s) => s.parentId).map((s) => s.parentId!))
    const leafStages = stages.filter((s) => !parentIds.has(s.id)).sort((a, b) => a.order - b.order)
    const stageIdx = leafStages.findIndex((s) => s.id === stageId)
    if (stageIdx === -1) return

    // Get the placed node's port names from its definition
    const thisNode = newNodes.find((n) => n.id === nodeId)
    const thisDef = thisNode?.type ? nodeRegistry.get(thisNode.type) : undefined
    const thisInput = thisDef?.inputs?.[0]?.name || 'in'
    const thisOutput = thisDef?.outputs?.[0]?.name || 'out'

    const prevStage = leafStages[stageIdx - 1]
    const nextStage = leafStages[stageIdx + 1]
    const allPlacements = newGridConfig.placements

    // Connect: prevStageNode → thisNode (left to right)
    if (prevStage) {
      const prevNodeIds = allPlacements
        .filter((p) => p.laneId === laneId && p.stageId === prevStage.id)
        .map((p) => p.nodeId)
      for (const srcId of prevNodeIds) {
        const srcNode = newNodes.find((n) => n.id === srcId)
        const srcDef = srcNode?.type ? nodeRegistry.get(srcNode.type) : undefined
        const srcOutput = srcDef?.outputs?.[0]?.name || 'out'
        get().addEdge({ source: srcId, sourceHandle: srcOutput, target: nodeId, targetHandle: thisInput })
      }
    }

    // Connect: thisNode → nextStageNode (left to right)
    if (nextStage) {
      const nextNodeIds = allPlacements
        .filter((p) => p.laneId === laneId && p.stageId === nextStage.id)
        .map((p) => p.nodeId)
      for (const tgtId of nextNodeIds) {
        const tgtNode = newNodes.find((n) => n.id === tgtId)
        const tgtDef = tgtNode?.type ? nodeRegistry.get(tgtNode.type) : undefined
        const tgtInput = tgtDef?.inputs?.[0]?.name || 'in'
        get().addEdge({ source: nodeId, sourceHandle: thisOutput, target: tgtId, targetHandle: tgtInput })
      }
    }
  },

  unplaceNode: (nodeId) => {
    const state = get()
    const newGridConfig = {
      ...state.gridConfig,
      placements: state.gridConfig.placements.filter((p) => p.nodeId !== nodeId),
    }
    const newNodes = state.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, laneId: undefined, stageId: undefined } }
        : node,
    )
    set({
      nodes: newNodes,
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, nodes: newNodes, gridConfig: newGridConfig }),
    })
  },

  // --- React Flow handlers ---

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },

  onConnect: (connection) => {
    const state = get()

    // Prevent duplicate edges
    const isDuplicate = state.edges.some(
      (e) =>
        e.source === connection.source &&
        e.target === connection.target &&
        e.sourceHandle === connection.sourceHandle &&
        e.targetHandle === connection.targetHandle
    )

    if (isDuplicate) {
      console.log('Prevented duplicate edge:', connection)
      return
    }

    // Auto-assign edge number
    const edgeNumber = getNextEdgeNumber(state.edges)

    // Create edge with number and empty label/description
    const connectionWithData = {
      ...connection,
      data: {
        number: edgeNumber,
        label: '',
        description: '',
        properties: {},
      },
    }

    const newEdges = addEdge(connectionWithData, state.edges)
    set({
      edges: newEdges,
      ...pushHistory({ ...state, edges: newEdges }),
    })
  },

  // --- Node operations ---

  addNode: (definitionType, position) => {
    let nodeType = definitionType

    // Auto-clone built-in nodes to create customizable copies
    if (!definitionType.startsWith('custom.')) {
      const clonedType = get().cloneNodeDefinition(definitionType)
      if (clonedType) {
        nodeType = clonedType
      }
    }

    // Get fresh state after cloneNodeDefinition (which increments registryVersion)
    const freshState = get()
    const definition = nodeRegistry.get(nodeType)
    const id = crypto.randomUUID()
    const newNode: WorkflowNode = {
      id,
      type: nodeType,
      position,
      data: {
        definitionType: nodeType,
        label: definition?.label ?? nodeType,
        config: definition?.defaultConfig ? { ...definition.defaultConfig } : {},
        _version: freshState.registryVersion, // Use fresh registryVersion after clone
      },
    }
    const newNodes = [...freshState.nodes, newNode]
    set({
      nodes: newNodes,
      registryVersion: freshState.registryVersion + 1, // Increment to trigger BaseNode re-render
      ...pushHistory({ ...freshState, nodes: newNodes }),
    })
  },

  removeNode: (id) => {
    const state = get()
    const newNodes = state.nodes.filter((n) => n.id !== id)
    const newEdges = state.edges.filter((e) => e.source !== id && e.target !== id)
    const newGridConfig = {
      ...state.gridConfig,
      placements: state.gridConfig.placements.filter((p) => p.nodeId !== id),
    }
    set({
      nodes: newNodes,
      edges: newEdges,
      gridConfig: newGridConfig,
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      ...pushHistory({ ...state, nodes: newNodes, edges: newEdges, gridConfig: newGridConfig }),
    })
  },

  updateNodeData: (id, data) => {
    const state = get()
    const newNodes = state.nodes.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node,
    )
    set({
      nodes: newNodes,
      ...pushHistory({ ...state, nodes: newNodes }),
    })
  },

  updateNodeConfig: (id, config) => {
    const state = get()
    const newNodes = state.nodes.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, config: { ...node.data.config, ...config } } }
        : node,
    )
    set({
      nodes: newNodes,
      ...pushHistory({ ...state, nodes: newNodes }),
    })
  },

  selectNode: (id) => {
    set({ selectedNodeId: id, selectedEdgeId: null, selectedNodeIds: id ? new Set([id]) : new Set<string>() })
  },

  // --- Edge operations ---

  addEdge: (params) => {
    const state = get()

    // Prevent duplicate edges
    const isDuplicate = state.edges.some(
      (e) =>
        e.source === params.source &&
        e.target === params.target &&
        e.sourceHandle === params.sourceHandle &&
        e.targetHandle === params.targetHandle
    )

    if (isDuplicate) {
      console.log('Prevented duplicate edge:', params)
      return
    }

    // Auto-assign edge number
    const edgeNumber = getNextEdgeNumber(state.edges)

    // Create connection with data
    const connection: any = {
      ...params,
      label: edgeNumber, // React Flow uses this for canvas display
      data: {
        number: edgeNumber,
        label: '',
        description: '',
        properties: {},
      },
    }

    const newEdges = addEdge(connection, state.edges)
    set({
      edges: newEdges,
      ...pushHistory({ ...state, edges: newEdges }),
    })
  },

  removeEdge: (id) => {
    const state = get()
    const newEdges = state.edges.filter((e) => e.id !== id)
    let expanded = state.expandedEdgeIds
    if (expanded.has(id)) {
      expanded = new Set(expanded)
      expanded.delete(id)
    }
    set({
      edges: newEdges,
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
      expandedEdgeIds: expanded,
      ...pushHistory({ ...state, edges: newEdges }),
    })
  },

  selectEdge: (id) => {
    set({ selectedEdgeId: id, selectedNodeId: null })
  },

  toggleEdgeExpand: (id) => {
    const expanded = new Set(get().expandedEdgeIds)
    if (expanded.has(id)) {
      expanded.delete(id)
    } else {
      expanded.add(id)
    }
    set({ expandedEdgeIds: expanded })
  },

  updateEdge: (id, data) => {
    const state = get()
    const newEdges = state.edges.map((edge) => {
      if (edge.id !== id) return edge

      const updatedData = { ...edge.data, ...data }
      // Use custom label or edge number — badge handles sub-step count display
      const baseName = updatedData.label || updatedData.number || ''

      return {
        ...edge,
        label: baseName,
        data: updatedData,
      }
    })

    // Auto-collapse if sub-steps become empty
    let expanded = state.expandedEdgeIds
    if (data.subSteps !== undefined && data.subSteps.length === 0 && expanded.has(id)) {
      expanded = new Set(expanded)
      expanded.delete(id)
    }

    set({
      edges: newEdges,
      expandedEdgeIds: expanded,
      ...pushHistory({ ...state, edges: newEdges }),
    })
  },

  // --- Workflow operations ---

  loadWorkflow: (workflow) => {
    const gridConfig = workflow.gridConfig ?? { lanes: [], stages: [], placements: [] }
    const customTypes = workflow.customNodeTypes ?? []
    const rawCustomCats = workflow.customCategories ?? []

    // Backwards compatibility: convert old string[] format to CategoryDefinition[]
    let customCats: CategoryDefinition[]
    if (rawCustomCats.length > 0 && typeof rawCustomCats[0] === 'string') {
      // Old format - migrate to new format with auto-numbering
      customCats = (rawCustomCats as unknown as string[]).map((path, index) => ({
        path,
        number: `C${index + 1}`,
        order: index,
      }))
    } else {
      // New format - use as is
      customCats = rawCustomCats as CategoryDefinition[]
    }

    // Migrate custom types to ensure they have customizable flag
    const migratedCustomTypes = customTypes.map((def) => ({
      ...def,
      customizable: def.customizable ?? true,
      isCustom: def.isCustom ?? true,
    }))

    // Auto-create missing custom node definitions
    const existingCustomTypes = new Set(migratedCustomTypes.map((def) => def.type))
    const missingTypes = new Map<string, NodeDefinition>()

    for (const node of workflow.nodes) {
      const nodeType = node.type
      // Check if this is a custom type that's not defined
      if (nodeType && nodeType.startsWith('custom.') && !existingCustomTypes.has(nodeType)) {
        if (!missingTypes.has(nodeType)) {
          // Create standard document node definition
          const label = (node.data.label as string) || nodeType.replace('custom.', '').replace(/-/g, ' ')
          missingTypes.set(nodeType, {
            type: nodeType,
            label,
            category: 'General',
            description: `Auto-generated from old workflow: ${label}`,
            icon: '📄',
            inputs: [{ name: 'in', type: 'document', label: 'Input' }],
            outputs: [{ name: 'out', type: 'document', label: 'Output' }],
            configSchema: [
              {
                key: 'documentNumber',
                label: 'Document Number',
                type: 'text',
                defaultValue: '',
              },
              {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  { label: 'Draft', value: 'draft' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Approved', value: 'approved' },
                  { label: 'Rejected', value: 'rejected' },
                  { label: 'Completed', value: 'completed' },
                ],
                defaultValue: 'draft',
              },
              {
                key: 'notes',
                label: 'Notes',
                type: 'textarea',
                defaultValue: '',
              },
              {
                key: 'reference',
                label: 'Reference',
                type: 'text',
                defaultValue: '',
              },
            ],
            defaultConfig: { documentNumber: '', status: 'draft', notes: '', reference: '' },
            color: 'bg-slate-600',
            flowType: 'document',
            documentType: label.toLowerCase().replace(/\s+/g, '-'),
            customizable: true,
            isCustom: true,
          })
        }
      }
    }

    // Add auto-created definitions to migratedCustomTypes
    const allCustomTypes = [...migratedCustomTypes, ...Array.from(missingTypes.values())]

    // Register custom types into the registry
    for (const def of allCustomTypes) {
      nodeRegistry.register(def)
    }

    // Process edges to ensure top-level label is set for React Flow canvas display
    const processedEdges = workflow.edges.map((edge) => {
      const displayLabel = edge.data?.label || edge.data?.number || ''
      return {
        ...edge,
        label: displayLabel,
      }
    })

    set({
      nodes: workflow.nodes,
      edges: processedEdges,
      metadata: workflow.metadata,
      gridConfig,
      customNodeTypes: allCustomTypes,
      customCategories: customCats,
      registryVersion: get().registryVersion + 1,
      selectedNodeId: null,
      selectedEdgeId: null,
      expandedEdgeIds: new Set<string>(),
      history: [{ nodes: workflow.nodes, edges: processedEdges, gridConfig }],
      historyIndex: 0,
    })
  },

  getWorkflow: () => {
    const { nodes, edges, metadata, gridConfig, customNodeTypes, customCategories } = get()
    return {
      metadata: {
        ...metadata,
        updatedAt: new Date().toISOString(),
      },
      nodes,
      edges,
      gridConfig,
      customNodeTypes: customNodeTypes.length > 0 ? customNodeTypes : undefined,
      customCategories: customCategories.length > 0 ? customCategories : undefined,
    }
  },

  saveToRecent: () => {
    const workflow = get().getWorkflow()
    pushRecentSave(workflow)
  },

  getRecentSaves: () => getRecentSaves(),

  updateMetadata: (partial) => {
    set({ metadata: { ...get().metadata, ...partial } })
  },

  clear: () => {
    // Unregister custom types from registry
    for (const def of get().customNodeTypes) {
      nodeRegistry.unregister(def.type)
    }
    set({
      nodes: [],
      edges: [],
      metadata: createEmptyMetadata(),
      gridConfig: { lanes: [], stages: [], placements: [] },
      customNodeTypes: [],
      customCategories: [],
      registryVersion: get().registryVersion + 1,
      selectedNodeId: null,
      selectedEdgeId: null,
      expandedEdgeIds: new Set<string>(),
      history: [{ nodes: [], edges: [], gridConfig: EMPTY_GRID }],
      historyIndex: 0,
    })
  },

  // --- Undo/redo ---

  undo: () => {
    const { historyIndex, history } = get()
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const entry = history[newIndex]
      set({
        nodes: structuredClone(entry.nodes),
        edges: structuredClone(entry.edges),
        gridConfig: structuredClone(entry.gridConfig),
        historyIndex: newIndex,
      })
    }
  },

  redo: () => {
    const { historyIndex, history } = get()
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const entry = history[newIndex]
      set({
        nodes: structuredClone(entry.nodes),
        edges: structuredClone(entry.edges),
        gridConfig: structuredClone(entry.gridConfig),
        historyIndex: newIndex,
      })
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // --- Import/Merge ---

  importWorkflow: (workflow, targetCell) => {
    const state = get()

    const context = {
      existingNodes: state.nodes,
      existingEdges: state.edges,
      existingGridConfig: state.gridConfig,
      existingCategories: state.customCategories,
      existingNodeTypes: state.customNodeTypes,
    }

    const result = mergeWorkflow(context, workflow)

    // Register new custom node types in the registry
    for (const def of result.newNodeTypes) {
      nodeRegistry.register(def)
    }

    // If a target cell is specified, preserve relative cell positions
    // (offset from the top-left-most node) anchored at the target cell
    let finalPlacements = result.newPlacements
    let finalNodes = result.newNodes
    if (targetCell) {
      // Build ordered leaf lists from the COMBINED grid (existing + new)
      const allLanes = [...state.gridConfig.lanes, ...result.newLanes]
      const allStages = [...state.gridConfig.stages, ...result.newStages]
      const leafLaneIds = getOrderedLeafIds(allLanes)
      const leafStageIds = getOrderedLeafIds(allStages)

      const targetLaneIdx = leafLaneIds.indexOf(targetCell.laneId)
      const targetStageIdx = leafStageIds.indexOf(targetCell.stageId)

      if (targetLaneIdx !== -1 && targetStageIdx !== -1 && result.newPlacements.length > 0) {
        // Find origin (top-left-most cell of the pasted nodes)
        let minLaneIdx = Infinity
        let minStageIdx = Infinity
        for (const p of result.newPlacements) {
          const li = leafLaneIds.indexOf(p.laneId)
          const si = leafStageIds.indexOf(p.stageId)
          if (li !== -1 && li < minLaneIdx) minLaneIdx = li
          if (si !== -1 && si < minStageIdx) minStageIdx = si
        }

        // Build placement map for quick lookup
        const placementByNode = new Map(result.newPlacements.map((p) => [p.nodeId, p]))

        finalPlacements = []
        finalNodes = result.newNodes.map((n) => {
          const placement = placementByNode.get(n.id)
          if (!placement) return n

          const origLaneIdx = leafLaneIds.indexOf(placement.laneId)
          const origStageIdx = leafStageIds.indexOf(placement.stageId)
          const laneOffset = origLaneIdx !== -1 ? origLaneIdx - minLaneIdx : 0
          const stageOffset = origStageIdx !== -1 ? origStageIdx - minStageIdx : 0

          // Clamp to grid bounds
          const newLaneIdx = Math.min(targetLaneIdx + laneOffset, leafLaneIds.length - 1)
          const newStageIdx = Math.min(targetStageIdx + stageOffset, leafStageIds.length - 1)
          const newLaneId = leafLaneIds[newLaneIdx]
          const newStageId = leafStageIds[newStageIdx]

          finalPlacements.push({ nodeId: n.id, laneId: newLaneId, stageId: newStageId })
          return { ...n, data: { ...n.data, laneId: newLaneId, stageId: newStageId } }
        })
      } else {
        // Fallback: put everything in target cell
        finalPlacements = result.newNodes.map((n) => ({
          nodeId: n.id,
          laneId: targetCell.laneId,
          stageId: targetCell.stageId,
        }))
        finalNodes = result.newNodes.map((n) => ({
          ...n,
          data: { ...n.data, laneId: targetCell.laneId, stageId: targetCell.stageId },
        }))
      }
    }

    const newNodes = [...state.nodes, ...finalNodes]
    const newEdges = [...state.edges, ...result.newEdges]
    const newGridConfig: GridConfig = {
      lanes: [...state.gridConfig.lanes, ...result.newLanes],
      stages: [...state.gridConfig.stages, ...result.newStages],
      placements: [...state.gridConfig.placements, ...finalPlacements],
      laneColumnWidth: state.gridConfig.laneColumnWidth,
    }
    const newCategories = [...state.customCategories, ...result.newCategories]
    const newNodeTypes = [...state.customNodeTypes, ...result.newNodeTypes]

    set({
      nodes: newNodes,
      edges: newEdges,
      gridConfig: newGridConfig,
      customCategories: newCategories,
      customNodeTypes: newNodeTypes,
      registryVersion: state.registryVersion + 1,
      ...pushHistory({ ...state, nodes: newNodes, edges: newEdges, gridConfig: newGridConfig }),
    })
  },

  // --- Multi-select & Clipboard ---

  toggleNodeSelection: (id) => {
    const state = get()
    const next = new Set(state.selectedNodeIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    set({ selectedNodeIds: next, selectedNodeId: next.size === 1 ? [...next][0] : null })
  },

  selectMultipleNodes: (ids) => {
    set({ selectedNodeIds: new Set(ids), selectedNodeId: ids.length === 1 ? ids[0] : null })
  },

  clearNodeSelection: () => {
    set({ selectedNodeIds: new Set<string>() })
  },

  copySelectedNodes: () => {
    const state = get()
    // Use multi-select if any, otherwise fall back to single selected node
    let ids = state.selectedNodeIds
    if (ids.size === 0 && state.selectedNodeId) {
      ids = new Set([state.selectedNodeId])
    }
    if (ids.size === 0) return

    const clipboard = buildClipboardWorkflow(
      ids,
      state.nodes,
      state.edges,
      state.gridConfig,
      state.customNodeTypes,
      state.customCategories,
    )
    set({ clipboard })
  },

  pasteNodes: () => {
    const state = get()
    if (!state.clipboard) return
    get().importWorkflow(state.clipboard, state.pasteTargetCell ?? undefined)
  },

  setPasteTargetCell: (cell) => {
    set({ pasteTargetCell: cell })
  },

  placeNodes: (moves) => {
    const state = get()

    // All moves share the same target cell (first entry)
    const targetLaneId = moves[0].laneId
    const targetStageId = moves[0].stageId

    // Compute relative offsets to preserve multi-cell spread
    const leafLaneIds = getOrderedLeafIds(state.gridConfig.lanes)
    const leafStageIds = getOrderedLeafIds(state.gridConfig.stages)
    const targetLaneIdx = leafLaneIds.indexOf(targetLaneId)
    const targetStageIdx = leafStageIds.indexOf(targetStageId)

    // Find origin (top-left of current positions)
    let minLaneIdx = Infinity
    let minStageIdx = Infinity
    for (const move of moves) {
      const p = state.gridConfig.placements.find((pl) => pl.nodeId === move.nodeId)
      if (p) {
        const li = leafLaneIds.indexOf(p.laneId)
        const si = leafStageIds.indexOf(p.stageId)
        if (li !== -1 && li < minLaneIdx) minLaneIdx = li
        if (si !== -1 && si < minStageIdx) minStageIdx = si
      }
    }

    let placements = [...state.gridConfig.placements]
    let nodes = [...state.nodes]

    for (const move of moves) {
      const currentPlacement = state.gridConfig.placements.find((p) => p.nodeId === move.nodeId)
      let newLaneId = targetLaneId
      let newStageId = targetStageId

      // Apply relative offset if we have valid indices
      if (currentPlacement && targetLaneIdx !== -1 && targetStageIdx !== -1 && minLaneIdx !== Infinity) {
        const origLaneIdx = leafLaneIds.indexOf(currentPlacement.laneId)
        const origStageIdx = leafStageIds.indexOf(currentPlacement.stageId)
        const laneOffset = origLaneIdx !== -1 ? origLaneIdx - minLaneIdx : 0
        const stageOffset = origStageIdx !== -1 ? origStageIdx - minStageIdx : 0
        const newLaneIdx = Math.min(targetLaneIdx + laneOffset, leafLaneIds.length - 1)
        const newStageIdx = Math.min(targetStageIdx + stageOffset, leafStageIds.length - 1)
        newLaneId = leafLaneIds[newLaneIdx]
        newStageId = leafStageIds[newStageIdx]
      }

      placements = placements.filter((p) => p.nodeId !== move.nodeId)
      placements.push({ nodeId: move.nodeId, laneId: newLaneId, stageId: newStageId })
      nodes = nodes.map((n) =>
        n.id === move.nodeId
          ? { ...n, data: { ...n.data, laneId: newLaneId, stageId: newStageId } }
          : n,
      )
    }

    const newGridConfig = { ...state.gridConfig, placements }
    set({
      nodes,
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, nodes, gridConfig: newGridConfig }),
    })
  },

  duplicateNodesToCell: (nodeIds, laneId, stageId) => {
    const state = get()
    const clipboard = buildClipboardWorkflow(
      new Set(nodeIds),
      state.nodes,
      state.edges,
      state.gridConfig,
      state.customNodeTypes,
      state.customCategories,
    )
    get().importWorkflow(clipboard, { laneId, stageId })
  },
}))
