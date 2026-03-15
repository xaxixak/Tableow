import { memo, useMemo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { isVirtualId } from "../../utils/virtualNodes.ts";
import type { EdgeSubStep } from "../../types/index.ts";

interface SubStepEdgeData {
  label?: string;
  number?: string;
  description?: string;
  subSteps?: EdgeSubStep[];
  [key: string]: unknown;
}

/** Check if a node is effectively unplaced (not in a visible grid cell) */
function isNodeUnplaced(nodeId: string, gridConfig: { placements: Array<{ nodeId: string; laneId: string; stageId: string }>; lanes: Array<{ id: string; parentId?: string }>; stages: Array<{ id: string; parentId?: string }> }): boolean {
  const { placements, lanes, stages } = gridConfig;
  const placement = placements.find((p) => p.nodeId === nodeId);
  if (!placement) return true;
  if (!lanes.some((l) => l.id === placement.laneId)) return true;
  if (!stages.some((s) => s.id === placement.stageId)) return true;
  if (stages.some((s) => s.parentId === placement.stageId)) return true;
  if (lanes.some((l) => l.parentId === placement.laneId)) return true;
  return false;
}

function SubStepEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
  style,
}: EdgeProps) {
  const isExpanded = useWorkflowStore((s) => s.expandedEdgeIds.has(id));
  const toggleEdgeExpand = useWorkflowStore((s) => s.toggleEdgeExpand);
  const openEdgeDetailModal = useWorkflowStore((s) => s.openEdgeDetailModal);
  const gridConfig = useWorkflowStore((s) => s.gridConfig);

  // Check if either endpoint is unplaced → edge becomes "canvas-only"
  const isCanvasEdge = useMemo(() => {
    return isNodeUnplaced(source, gridConfig) || isNodeUnplaced(target, gridConfig);
  }, [source, target, gridConfig]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // ── Virtual sub-edge: simple amber edge, no labels/badges ──
  if (isVirtualId(id)) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={style ?? { stroke: "#f59e0b", strokeWidth: 2 }}
      />
    );
  }

  const edgeData = data as SubStepEdgeData | undefined;
  const stepCount = edgeData?.subSteps?.length ?? 0;
  const hasSubSteps = stepCount > 0;
  const edgeLabel = edgeData?.number || edgeData?.label || "";

  // ── Expanded mode: faint dashed path + collapse label offset above ──
  if (isExpanded && hasSubSteps) {
    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: "#f59e0b",
            strokeWidth: 2,
            strokeDasharray: "6 4",
            opacity: 0.15,
          }}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 50}px)`,
              pointerEvents: "all",
              zIndex: 10,
            }}
            className="nopan nodrag"
          >
            <div className="flex items-center gap-1">
              {edgeLabel && (
                <span className="px-2 py-1 rounded-full bg-amber-500/80 text-white text-[10px] font-semibold">
                  {edgeLabel}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEdgeDetailModal(id);
                }}
                className="px-2.5 py-1 rounded-full bg-blue-500 dark:bg-blue-600 border border-blue-600 dark:border-blue-500 text-white text-[10px] font-semibold hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors cursor-pointer shadow-md"
                title="Edit connection detail"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEdgeExpand(id);
                }}
                className="px-2.5 py-1 rounded-full bg-amber-500 dark:bg-amber-600 border border-amber-600 dark:border-amber-500 text-white text-[10px] font-semibold hover:bg-amber-600 dark:hover:bg-amber-500 transition-colors cursor-pointer shadow-md"
                title="Collapse sub-steps"
              >
                ▲ Collapse
              </button>
            </div>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }

  // ── Collapsed state: path + label + orange badge ──
  // Canvas-only edges (touching at least one unplaced node) get orange dashed style
  const edgeStroke = selected ? "#3b82f6" : isCanvasEdge ? "#f97316" : "#64748b";
  const edgeDash = isCanvasEdge && !selected ? "6 4" : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeStroke,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: edgeDash,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nopan nodrag"
        >
          <div className="flex items-center gap-1.5">
            {/* Canvas-only badge */}
            {isCanvasEdge && !selected && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-500 text-white uppercase tracking-wider">
                Canvas
              </span>
            )}

            {/* Edge number label */}
            {edgeLabel && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded bg-white/90 dark:bg-zinc-800/90 border ${
                  selected
                    ? "border-blue-400 text-blue-600 font-semibold"
                    : isCanvasEdge
                      ? "border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400"
                      : "border-slate-200 dark:border-zinc-600 text-slate-500 dark:text-zinc-400"
                }`}
              >
                {edgeLabel}
              </span>
            )}

            {/* Orange badge with sub-step count — click to expand on canvas */}
            {hasSubSteps && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEdgeExpand(id);
                }}
                className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold border-2 border-white dark:border-zinc-800 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                title={`${stepCount} sub-step${stepCount !== 1 ? "s" : ""} — click to expand`}
              >
                {stepCount}
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(SubStepEdge);
