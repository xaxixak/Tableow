import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { ExpandedEdgeFlow } from "./ExpandedEdgeFlow.tsx";
import { isVirtualId } from "../../utils/virtualNodes.ts";
import type { EdgeSubStep } from "../../types/index.ts";

interface SubStepEdgeData {
  label?: string;
  number?: string;
  description?: string;
  subSteps?: EdgeSubStep[];
  [key: string]: unknown;
}

function SubStepEdge({
  id,
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
  const [showInlinePanel, setShowInlinePanel] = useState(false);

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

  // ── Expanded mode: faint dashed path + collapse label (still interactive) ──
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
            opacity: 0.3,
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleEdgeExpand(id);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-[10px] font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
              title="Click to collapse"
            >
              <span>{edgeLabel}</span>
              <span className="text-amber-500">▲ collapse</span>
            </button>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }

  // ── Collapsed state: path + label + orange badge ──
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "#3b82f6" : "#64748b",
          strokeWidth: selected ? 3 : 2,
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
            {/* Edge number label */}
            {edgeLabel && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded bg-white/90 dark:bg-zinc-800/90 border ${
                  selected
                    ? "border-blue-400 text-blue-600 font-semibold"
                    : "border-slate-200 dark:border-zinc-600 text-slate-500 dark:text-zinc-400"
                }`}
              >
                {edgeLabel}
              </span>
            )}

            {/* Orange badge with sub-step count — click to show inline panel */}
            {hasSubSteps && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInlinePanel(!showInlinePanel);
                }}
                className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold border-2 border-white dark:border-zinc-800 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                title={`${stepCount} sub-step${stepCount !== 1 ? "s" : ""} — click to quick-edit, double-click edge to expand`}
              >
                {stepCount}
              </div>
            )}
          </div>

          {/* Inline panel (popover) — shown on badge click */}
          {showInlinePanel && hasSubSteps && (
            <div className="mt-2">
              <ExpandedEdgeFlow edgeId={id} onClose={() => setShowInlinePanel(false)} />
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(SubStepEdge);
