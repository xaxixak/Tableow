import type { WorkflowNode, WorkflowEdge } from '../types/index.ts'

/** Prefix for all virtual node/edge IDs */
export const VIRTUAL_PREFIX = 'virtual-'

export function isVirtualId(id: string): boolean {
  return id.startsWith(VIRTUAL_PREFIX)
}

interface VirtualResult {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/**
 * Generate virtual sub-step nodes and connecting edges for an expanded edge.
 * Positions nodes evenly along the line between source and target.
 */
export function generateVirtualsForEdge(
  edge: WorkflowEdge,
  sourceNode: WorkflowNode,
  targetNode: WorkflowNode,
): VirtualResult {
  const subSteps = edge.data?.subSteps ?? []
  if (subSteps.length === 0) return { nodes: [], edges: [] }

  const sorted = [...subSteps].sort((a, b) => a.order - b.order)

  // Source and target positions (center)
  const sx = sourceNode.position.x + (sourceNode.measured?.width ?? 180)
  const sy = sourceNode.position.y + (sourceNode.measured?.height ?? 80) / 2
  const tx = targetNode.position.x
  const ty = targetNode.position.y + (targetNode.measured?.height ?? 80) / 2

  // Virtual node dimensions (approx)
  const nodeW = 140
  const nodeH = 56

  const nodes: WorkflowNode[] = []
  const edges: WorkflowEdge[] = []
  const segments = sorted.length + 1 // gaps between source, steps, target

  sorted.forEach((step, index) => {
    const t = (index + 1) / segments
    const nodeId = `${VIRTUAL_PREFIX}${edge.id}-${index}`

    nodes.push({
      id: nodeId,
      type: 'substep',
      position: {
        x: sx + (tx - sx) * t - nodeW / 2,
        y: sy + (ty - sy) * t - nodeH / 2,
      },
      data: {
        definitionType: 'substep',
        label: step.label,
        config: {},
        edgeId: edge.id,
        stepIndex: index,
        stepId: step.id,
      },
      draggable: false,
      selectable: false,
    })
  })

  // Sub-edges: source → step0 → step1 → ... → target
  // Source → first step
  edges.push(makeVirtualEdge(
    edge.id,
    'source',
    edge.source,
    nodes[0].id,
    edge.sourceHandle,
    'in',
  ))

  // Step to step
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push(makeVirtualEdge(
      edge.id,
      `${i}-${i + 1}`,
      nodes[i].id,
      nodes[i + 1].id,
      'out',
      'in',
    ))
  }

  // Last step → target
  edges.push(makeVirtualEdge(
    edge.id,
    'target',
    nodes[nodes.length - 1].id,
    edge.target,
    'out',
    edge.targetHandle,
  ))

  return { nodes, edges }
}

function makeVirtualEdge(
  parentEdgeId: string,
  suffix: string,
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): WorkflowEdge {
  return {
    id: `${VIRTUAL_PREFIX}subedge-${parentEdgeId}-${suffix}`,
    source,
    target,
    sourceHandle: sourceHandle ?? undefined,
    targetHandle: targetHandle ?? undefined,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    data: {},
    selectable: false,
    deletable: false,
  }
}

/**
 * Generate all virtual nodes and edges for a set of expanded edges.
 */
export function generateAllVirtuals(
  expandedEdgeIds: Set<string>,
  edges: WorkflowEdge[],
  nodes: WorkflowNode[],
): VirtualResult {
  const allNodes: WorkflowNode[] = []
  const allEdges: WorkflowEdge[] = []

  for (const edgeId of expandedEdgeIds) {
    const edge = edges.find((e) => e.id === edgeId)
    if (!edge || !edge.data?.subSteps?.length) continue

    const sourceNode = nodes.find((n) => n.id === edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)
    if (!sourceNode || !targetNode) continue

    const result = generateVirtualsForEdge(edge, sourceNode, targetNode)
    allNodes.push(...result.nodes)
    allEdges.push(...result.edges)
  }

  return { nodes: allNodes, edges: allEdges }
}
