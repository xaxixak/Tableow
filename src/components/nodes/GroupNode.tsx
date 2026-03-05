import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils.ts";

function GroupNode({ data, selected }: NodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const label = (data.label as string) ?? "Group";
  const childCount = (data.childCount as number) ?? 0;

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={collapsed ? 48 : 120}
        lineClassName="!border-blue-400"
        handleClassName="!w-2.5 !h-2.5 !bg-blue-500 !border-white !border-2 !rounded-sm"
      />

      <div
        className={cn(
          "rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/80",
          "transition-all duration-200",
          selected && "border-blue-400 bg-blue-50/50",
          collapsed ? "min-h-[48px]" : "min-h-[120px] min-w-[200px]"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 bg-slate-200/80 rounded-t-md",
            "cursor-pointer select-none"
          )}
          onClick={toggleCollapse}
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} group ${label}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleCollapse();
            }
          }}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-700 truncate">
            {label}
          </span>
          {collapsed && childCount > 0 && (
            <span className="ml-auto text-xs text-slate-500 whitespace-nowrap">
              {childCount} node{childCount !== 1 ? "s" : ""} inside
            </span>
          )}
        </div>

        {/* Body area for child nodes */}
        {!collapsed && (
          <div className="p-2 min-h-[72px]">
            {/* React Flow renders child nodes here via parentId/extent */}
          </div>
        )}

        {/* Group can serve as connection target */}
        <Handle
          type="target"
          position={Position.Left}
          id="group-in"
          title="Group input"
          className="!w-3 !h-3 !border-2 !rounded-full !bg-gray-400 !border-gray-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="group-out"
          title="Group output"
          className="!w-3 !h-3 !border-2 !rounded-full !bg-gray-400 !border-gray-500"
        />
      </div>
    </>
  );
}

export default memo(GroupNode);
