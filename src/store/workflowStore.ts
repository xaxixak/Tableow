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
  Workflow,
  WorkflowMetadata,
  GridConfig,
  LaneDefinition,
  StageDefinition,
  NodeDefinition,
  CategoryDefinition,
} from '@/types/index.ts'
import { nodeRegistry } from '@/registry/index.ts'
import {
  getNextCategoryNumber,
  getNextNodeNumber,
  getNextEdgeNumber,
} from '@/utils/numbering.ts'

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
  }) => void
  removeCustomNodeType: (type: string) => void

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
 * Auto-connect a placed node to adjacent-stage nodes in the same lane.
 * Returns new edges to add (avoids duplicates).
 */
function autoConnectEdges(
  nodeId: string,
  laneId: string,
  stageId: string,
  gridConfig: GridConfig,
  existingEdges: WorkflowEdge[],
): WorkflowEdge[] {
  const { stages, placements } = gridConfig

  // Only consider LEAF stages (no children) - the actual columns where nodes are placed
  const stageChildren = new Map<string, string[]>()
  for (const s of stages) {
    if (s.parentId) {
      if (!stageChildren.has(s.parentId)) stageChildren.set(s.parentId, [])
      stageChildren.get(s.parentId)!.push(s.id)
    }
  }

  const leafStages = stages.filter((s) => !stageChildren.has(s.id))
  const sortedStages = [...leafStages].sort((a, b) => a.order - b.order)
  const stageOrderIndex = new Map(sortedStages.map((s, i) => [s.id, i]))

  const thisOrder = stageOrderIndex.get(stageId)
  if (thisOrder === undefined) return []

  // Find prev and next stages
  const prevStage = sortedStages[thisOrder - 1]
  const nextStage = sortedStages[thisOrder + 1]

  // Existing edge set for dedup
  const edgeSet = new Set(existingEdges.map((e) => `${e.source}→${e.target}`))
  const newEdges: WorkflowEdge[] = []

  // Connect FROM previous-stage nodes in same lane → this node
  if (prevStage) {
    const prevNodes = placements.filter(
      (p) => p.laneId === laneId && p.stageId === prevStage.id
    )
    for (const p of prevNodes) {
      const key = `${p.nodeId}→${nodeId}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        newEdges.push({
          id: `e-${p.nodeId}-${nodeId}`,
          source: p.nodeId,
          target: nodeId,
        })
      }
    }
  }

  // Connect FROM this node → next-stage nodes in same lane
  if (nextStage) {
    const nextNodes = placements.filter(
      (p) => p.laneId === laneId && p.stageId === nextStage.id
    )
    for (const p of nextNodes) {
      const key = `${nodeId}→${p.nodeId}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        newEdges.push({
          id: `e-${nodeId}-${p.nodeId}`,
          source: nodeId,
          target: p.nodeId,
        })
      }
    }
  }

  return newEdges
}

function baseTypeToPorts(baseType: string): { inputs: NodeDefinition['inputs']; outputs: NodeDefinition['outputs'] } {
  switch (baseType) {
    case 'decision':
      return {
        inputs: [{ name: 'document', type: 'document', label: 'Document' }],
        outputs: [
          { name: 'yes', type: 'document', label: 'Yes' },
          { name: 'no', type: 'document', label: 'No' },
        ],
      }
    case 'start':
      return {
        inputs: [],
        outputs: [{ name: 'out', type: 'flow', label: 'Out' }],
      }
    case 'output':
      return {
        inputs: [{ name: 'document', type: 'document', label: 'Document' }],
        outputs: [],
      }
    case 'process':
    default:
      return {
        inputs: [{ name: 'in', type: 'document', label: 'Input' }],
        outputs: [{ name: 'out', type: 'document', label: 'Output' }],
      }
  }
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  metadata: createEmptyMetadata(),
  selectedNodeId: null,
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
    set({ viewMode: mode })
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
        return { ...node, data: { ...node.data, label: updates.label } }
      }

      // Force re-render by creating new data object (breaks memo equality check)
      return { ...node, data: { ...node.data } }
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
      configSchema: [...configSchema, field],
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
      configSchema: updatedFields,
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
    }
    nodeRegistry.register(def)
    set({
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

  placeNode: (nodeId, laneId, stageId) => {
    const state = get()
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
    // Auto-connect: create edges to/from adjacent-stage nodes in same lane
    const autoEdges = autoConnectEdges(nodeId, laneId, stageId, newGridConfig, state.edges)
    const newEdges = [...state.edges, ...autoEdges]
    set({
      nodes: newNodes,
      edges: newEdges,
      gridConfig: newGridConfig,
      ...pushHistory({ ...state, nodes: newNodes, edges: newEdges, gridConfig: newGridConfig }),
    })
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
    const newEdges = addEdge(connection, state.edges)
    set({
      edges: newEdges,
      ...pushHistory({ ...state, edges: newEdges }),
    })
  },

  // --- Node operations ---

  addNode: (definitionType, position) => {
    const state = get()
    let nodeType = definitionType

    // Auto-clone built-in nodes to create customizable copies
    if (!definitionType.startsWith('custom.')) {
      const clonedType = get().cloneNodeDefinition(definitionType)
      if (clonedType) {
        nodeType = clonedType
      }
    }

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
      },
    }
    const newNodes = [...state.nodes, newNode]
    set({
      nodes: newNodes,
      ...pushHistory({ ...state, nodes: newNodes }),
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
    set({ selectedNodeId: id })
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

    // Register custom types into the registry
    for (const def of customTypes) {
      nodeRegistry.register(def)
    }
    set({
      nodes: workflow.nodes,
      edges: workflow.edges,
      metadata: workflow.metadata,
      gridConfig,
      customNodeTypes: customTypes,
      customCategories: customCats,
      registryVersion: get().registryVersion + 1,
      selectedNodeId: null,
      history: [{ nodes: workflow.nodes, edges: workflow.edges, gridConfig }],
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
}))
