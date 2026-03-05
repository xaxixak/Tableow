import { memo, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Edit3, Palette } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import type { LaneDefinition, StageDefinition, GridPlacement } from "../../types/grid.ts";
import type { WorkflowNode } from "../../types/index.ts";
import GridCell from "./GridCell.tsx";

interface ContextMenuState {
  x: number;
  y: number;
}

const LANE_COLORS = [
  { label: "Default", value: undefined },
  { label: "Blue", value: "bg-blue-50 border-blue-200" },
  { label: "Green", value: "bg-green-50 border-green-200" },
  { label: "Yellow", value: "bg-yellow-50 border-yellow-200" },
  { label: "Red", value: "bg-red-50 border-red-200" },
  { label: "Purple", value: "bg-purple-50 border-purple-200" },
];

interface GridLaneProps {
  lane: LaneDefinition;
  childLanes: LaneDefinition[];
  leafStages: StageDefinition[];
  placements: GridPlacement[];
  nodes: WorkflowNode[];
  depth?: number;
}

function GridLane({
  lane,
  childLanes,
  leafStages,
  placements,
  nodes,
  depth = 0,
}: GridLaneProps) {
  const updateLane = useWorkflowStore((s) => s.updateLane);
  const removeLane = useWorkflowStore((s) => s.removeLane);
  const addLane = useWorkflowStore((s) => s.addLane);

  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(lane.label);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasChildren = childLanes.length > 0;

  // Direct children of this lane
  const directChildren = useMemo(
    () =>
      childLanes
        .filter((l) => l.parentId === lane.id)
        .sort((a, b) => a.order - b.order),
    [childLanes, lane.id]
  );

  // All descendant lanes (for recursive nesting)
  const allDescendants = useMemo(() => {
    const result: LaneDefinition[] = [];
    const findDescendants = (parentId: string) => {
      for (const l of childLanes) {
        if (l.parentId === parentId) {
          result.push(l);
          findDescendants(l.id);
        }
      }
    };
    findDescendants(lane.id);
    return result;
  }, [childLanes, lane.id]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = useCallback(() => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== lane.label) {
      updateLane(lane.id, { label: trimmed });
    } else {
      setEditValue(lane.label);
    }
  }, [editValue, lane.id, lane.label, updateLane]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleRename = useCallback(() => {
    closeContextMenu();
    setEditing(true);
  }, [closeContextMenu]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete lane "${lane.label}"?`)) {
      removeLane(lane.id);
    }
    closeContextMenu();
  }, [lane.id, lane.label, removeLane, closeContextMenu]);

  const handleAddSubLane = useCallback(() => {
    const name = window.prompt("Sub-lane name:");
    if (name?.trim()) {
      const maxOrder = childLanes.reduce((max, l) => Math.max(max, l.order), 0);
      addLane({ label: name.trim(), parentId: lane.id, order: maxOrder + 1 });
    }
    closeContextMenu();
  }, [childLanes, lane.id, addLane, closeContextMenu]);

  const handleColorChange = useCallback(
    (color: string | undefined) => {
      updateLane(lane.id, { color });
      closeContextMenu();
    },
    [lane.id, updateLane, closeContextMenu]
  );

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeContextMenu();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu, closeContextMenu]);

  const laneColorClass = lane.color ?? "";

  return (
    <>
      {/* This lane's row */}
      <div className="contents" role="row">
        {/* Lane label cell (sticky left) */}
        <div
          className={cn(
            "sticky left-0 z-10 flex items-center gap-1 px-2 py-2",
            "bg-white border-r border-b border-slate-200",
            "min-w-[120px] select-none",
            laneColorClass
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onContextMenu={handleContextMenu}
        >
          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-0.5 rounded hover:bg-slate-100 shrink-0"
              aria-label={collapsed ? "Expand lane" : "Collapse lane"}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          ) : (
            <span className="w-4.5 shrink-0" />
          )}

          {/* Lane label (inline editable) */}
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setEditValue(lane.label);
                  setEditing(false);
                }
              }}
              className="px-1 py-0.5 text-xs font-medium border border-blue-400 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 min-w-[60px]"
            />
          ) : (
            <span
              onDoubleClick={() => setEditing(true)}
              className="text-xs font-medium text-slate-700 truncate cursor-default"
              title="Double-click to rename"
            >
              {lane.label}
            </span>
          )}
        </div>

        {/* Cells for each leaf stage */}
        {leafStages.map((stage) => (
          <GridCell
            key={`${lane.id}-${stage.id}`}
            laneId={lane.id}
            stageId={stage.id}
            placements={placements}
            nodes={nodes}
            collapsedChildLaneIds={
              collapsed && hasChildren
                ? [lane.id, ...allDescendants.map((l) => l.id)]
                : undefined
            }
          />
        ))}
      </div>

      {/* Child lanes (if not collapsed) */}
      {!collapsed &&
        directChildren.map((child) => (
          <GridLane
            key={child.id}
            lane={child}
            childLanes={allDescendants.filter((l) => l.id !== child.id)}
            leafStages={leafStages}
            placements={placements}
            nodes={nodes}
            depth={depth + 1}
          />
        ))}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRename}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Rename
          </button>
          <button
            onClick={handleAddSubLane}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Sub-lane
          </button>

          {/* Color submenu */}
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-500">Color</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {LANE_COLORS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => handleColorChange(c.value)}
                  className={cn(
                    "w-5 h-5 rounded border border-slate-300",
                    c.value ?? "bg-white",
                    lane.color === c.value && "ring-2 ring-blue-500"
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <hr className="my-1 border-slate-100" />
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </>
  );
}

export default memo(GridLane);
