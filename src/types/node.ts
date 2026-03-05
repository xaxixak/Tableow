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
}
