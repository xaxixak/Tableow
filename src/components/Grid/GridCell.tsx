import { memo, useState, useCallback, useMemo, type DragEvent } from "react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import type { WorkflowNode } from "../../types/index.ts";
import type { GridPlacement } from "../../types/grid.ts";
import GridNode from "./GridNode.tsx";

interface GridCellProps {
  laneId: string;
  stageId: string;
  placements: GridPlacement[];
  nodes: WorkflowNode[];
  /** When parent lane is collapsed, include all descendant lane IDs to show their nodes */
  collapsedChildLaneIds?: string[];
}

function GridCell({ laneId, stageId, placements, nodes, collapsedChildLaneIds }: GridCellProps) {
  const addNode = useWorkflowStore((s) => s.addNode);
  const placeNode = useWorkflowStore((s) => s.placeNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  const [isDragOver, setIsDragOver] = useState(false);

  const cellNodes = useMemo(() => {
    // When collapsed, show nodes from this lane AND all descendant lanes
    const laneIds = collapsedChildLaneIds
      ? new Set(collapsedChildLaneIds)
      : new Set([laneId]);

    const nodeIds = new Set(
      placements
        .filter((p) => laneIds.has(p.laneId) && p.stageId === stageId)
        .map((p) => p.nodeId)
    );
    return nodes.filter((n) => nodeIds.has(n.id));
  }, [placements, laneId, stageId, nodes, collapsedChildLaneIds]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (
      e.dataTransfer.types.includes("application/reactflow-type") ||
      e.dataTransfer.types.includes("application/grid-node-move")
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      // Case 1: Moving an existing node between cells
      const moveNodeId = e.dataTransfer.getData("application/grid-node-move");
      if (moveNodeId) {
        placeNode(moveNodeId, laneId, stageId);
        return;
      }

      // Case 2: Dropping a new node from palette
      const nodeType = e.dataTransfer.getData("application/reactflow-type");
      if (!nodeType) return;

      const nodesBefore = useWorkflowStore.getState().nodes;
      addNode(nodeType, { x: 0, y: 0 });
      const nodesAfter = useWorkflowStore.getState().nodes;

      const newNode = nodesAfter.find(
        (n) => !nodesBefore.some((prev) => prev.id === n.id)
      );
      if (newNode) {
        placeNode(newNode.id, laneId, stageId);
      }
    },
    [addNode, placeNode, laneId, stageId]
  );

  const handleCellClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const isEmpty = cellNodes.length === 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCellClick}
      className={cn(
        "min-h-[60px] min-w-[150px] p-1.5 flex flex-col",
        "border-r border-b border-slate-200 dark:border-zinc-800",
        isEmpty && "border-dashed",
        isDragOver && "bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700",
        !isDragOver && "bg-slate-50/50 hover:bg-slate-50 dark:bg-black dark:hover:bg-zinc-950"
      )}
      role="gridcell"
      aria-label={`Cell: lane ${laneId}, stage ${stageId}`}
    >
      <div className="flex flex-col gap-1 flex-1">
        {cellNodes.map((node) => (
          <GridNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

export default memo(GridCell);
