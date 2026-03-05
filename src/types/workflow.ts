import type { Node, Edge } from '@xyflow/react'
import type { NodeDefinition } from './node.ts'
import type { GridConfig } from './grid.ts'

/**
 * Data stored on each workflow node instance.
 * This is the `data` field of a React Flow Node.
 */
export interface WorkflowNodeData {
  /** Reference to the NodeDefinition type (e.g. "accounting.invoice") */
  definitionType: string
  label: string
  config: Record<string, unknown>
  /** If this node is inside a group, the parent group node's ID */
  parentId?: string
  /** Whether a group node is collapsed */
  collapsed?: boolean
  /** Grid placement — which lane this node belongs to */
  laneId?: string
  /** Grid placement — which stage this node belongs to */
  stageId?: string
  [key: string]: unknown
}

/**
 * A WorkflowNode is a React Flow Node with typed data.
 */
export type WorkflowNode = Node<WorkflowNodeData>

/**
 * A WorkflowEdge is a React Flow Edge with optional metadata.
 */
export type WorkflowEdge = Edge<{
  /** Label shown on the connection */
  label?: string
}>

/**
 * Metadata about a saved workflow.
 */
export interface WorkflowMetadata {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  version: number
}

/**
 * Complete workflow document — serialized to/from JSON.
 */
export interface Workflow {
  metadata: WorkflowMetadata
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  gridConfig?: GridConfig
  /** User-created node type definitions (persisted with the workflow) */
  customNodeTypes?: NodeDefinition[]
  /** User-created category names (persisted with the workflow) */
  customCategories?: string[]
}
