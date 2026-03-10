import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "../../lib/utils.ts";

/**
 * A virtual node representing an expanded edge sub-step on the canvas.
 * Visually distinct from regular workflow nodes — amber/orange theme, smaller.
 */
function SubStepNode({ data, selected }: NodeProps) {
  const label = (data.label as string) ?? "Step";

  return (
    <div
      className={cn(
        "min-w-[120px] rounded-lg shadow-md border-2 border-dashed",
        "border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-600",
        "transition-shadow duration-150",
        selected && "ring-2 ring-blue-500 shadow-lg"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-[6px] bg-amber-500 dark:bg-amber-600 text-white text-xs font-medium">
        <span className="text-sm leading-none">◆</span>
        <span className="truncate">{label}</span>
      </div>

      {/* Body with handles */}
      <div className="relative px-3 py-2 min-h-[24px]">
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!w-2.5 !h-2.5 !border-2 !rounded-full !bg-amber-500 !border-amber-600"
        />

        <div className="flex justify-between gap-4 text-[10px] text-amber-700 dark:text-amber-300">
          <span>In</span>
          <span>Out</span>
        </div>

        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!w-2.5 !h-2.5 !border-2 !rounded-full !bg-amber-500 !border-amber-600"
        />
      </div>
    </div>
  );
}

export default memo(SubStepNode);
