import type { ComponentType } from 'react'

/**
 * Supported data types for node ports.
 * "any" matches all types; specific types enforce connection compatibility.
 */
export type PortType = 'string' | 'number' | 'boolean' | 'document' | 'list' | 'object' | 'flow' | 'any'

/**
 * Defines a single input or output port on a node.
 * The `name` field is used as the React Flow handle ID.
 */
export interface PortDefinition {
  name: string
  label?: string
  type: PortType
  /** Whether this port accepts multiple connections (default: false for inputs, true for outputs) */
  multiple?: boolean
  required?: boolean
}

/**
 * Schema for a single configurable property on a node.
 */
export interface ConfigFieldDefinition {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean' | 'textarea' | 'json'
  defaultValue?: unknown
  options?: { label: string; value: string }[]
  placeholder?: string
  required?: boolean
}

/**
 * Category metadata for grouping nodes in the palette.
 */
export interface NodeCategory {
  id: string
  label: string
  icon?: string
  color?: string
}

/**
 * User-created category definition with auto-numbering.
 * Categories get sequential numbers: C1, C2, C3, ...
 */
export interface CategoryDefinition {
  /** Full category path (e.g., "My Workflows/AR") */
  path: string
  /** System auto-generated category number (e.g., "C1", "C2") */
  number: string
  /** Creation order for sequential numbering */
  order: number
  /** Color palette index assigned during auto-numbering */
  colorIndex?: number
}

/**
 * Workflow/control flow types for visual rendering and flow logic.
 */
export type FlowType = 'start' | 'process' | 'decision' | 'output' | 'end' | 'subprocess' | 'document'

/**
 * A NodeDefinition is the blueprint/template for a type of node.
 * Registered in the NodeRegistry, used to instantiate WorkflowNodes.
 */
export interface NodeDefinition {
  /** Unique type identifier, e.g. "accounting.invoice" or "core.transform" */
  type: string
  label: string
  description?: string
  /** Category string for grouping in palette (matches NodeCategory.id) */
  category: string
  icon?: string
  color?: string
  inputs: PortDefinition[]
  outputs: PortDefinition[]
  configSchema?: ConfigFieldDefinition[]
  /** Default config values applied when a node is created */
  defaultConfig?: Record<string, unknown>
  /** Whether this node can contain child nodes (group/sub-workflow) */
  isGroup?: boolean
  /** Custom React component for rendering this node (optional - falls back to default) */
  component?: ComponentType<{ id: string }>

  // -- Workflow Type Classification --
  /** Workflow/control flow type - determines node shape and behavior */
  flowType: FlowType
  /** Optional freeform document/entity type for user classification (e.g., "invoice", "video-render") */
  documentType?: string

  // -- Cloning & Customization Fields --
  /** Original built-in node type this was cloned from (if applicable) */
  sourceTemplateType?: string
  /** Whether this is a custom node (computed from type.startsWith('custom.')) */
  isCustom?: boolean
  /** Whether this node definition can be edited by user */
  customizable?: boolean
  /** System auto-generated node number (e.g., "C1-001", "C2-015") */
  number?: string
  /** Category number this node belongs to (e.g., "C1") */
  categoryNumber?: string
}
