import type { NodeTypes } from "@xyflow/react";
import BaseNode from "./BaseNode.tsx";
import GroupNode from "./GroupNode.tsx";
import { nodeRegistry } from "../../registry/index.ts";

/**
 * Static node types for known custom renderers.
 * The canvas also dynamically maps all registry types to BaseNode.
 */
export const staticNodeTypes: NodeTypes = {
  base: BaseNode,
  group: GroupNode,
};

/**
 * Build a complete nodeTypes map by assigning BaseNode
 * to every registered definition type. This lets the store
 * create nodes with type="text-input" etc. and React Flow
 * renders them all via BaseNode.
 */
export function buildNodeTypes(): NodeTypes {
  const types: NodeTypes = { ...staticNodeTypes };
  for (const def of nodeRegistry.getAll()) {
    if (!(def.type in types)) {
      types[def.type] = BaseNode;
    }
  }
  return types;
}
