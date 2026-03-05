/** A lane (row) in the grid — can be nested */
export interface LaneDefinition {
  id: string
  label: string
  color?: string
  parentId?: string
  order: number
}

/** A stage (column) in the grid — can have parent headers */
export interface StageDefinition {
  id: string
  label: string
  parentId?: string
  order: number
}

/** Assignment of a node to a lane×stage cell */
export interface GridPlacement {
  nodeId: string
  laneId: string
  stageId: string
}

/** Grid configuration stored in workflow */
export interface GridConfig {
  lanes: LaneDefinition[]
  stages: StageDefinition[]
  placements: GridPlacement[]
}
