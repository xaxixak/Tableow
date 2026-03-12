import { memo, useState, useCallback, useMemo, useRef, useEffect, type DragEvent } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Edit3, Palette, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
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
  { label: "Default", hex: undefined },
  { label: "Blue", hex: "#3b82f6" },
  { label: "Green", hex: "#22c55e" },
  { label: "Cyan", hex: "#06b6d4" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Red", hex: "#ef4444" },
  { label: "Purple", hex: "#a855f7" },
  { label: "Pink", hex: "#ec4899" },
  { label: "Orange", hex: "#f97316" },
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
  const reorderLanes = useWorkflowStore((s) => s.reorderLanes);
  const insertLane = useWorkflowStore((s) => s.insertLane);

  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(lane.label);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | 'child' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);

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

  const handleInsertAbove = useCallback(() => {
    const name = window.prompt("Lane name:");
    if (name?.trim()) {
      insertLane({ label: name.trim(), order: 0, parentId: lane.parentId }, lane.id, "before");
    }
    closeContextMenu();
  }, [lane.id, lane.parentId, insertLane, closeContextMenu]);

  const handleInsertBelow = useCallback(() => {
    const name = window.prompt("Lane name:");
    if (name?.trim()) {
      insertLane({ label: name.trim(), order: 0, parentId: lane.parentId }, lane.id, "after");
    }
    closeContextMenu();
  }, [lane.id, lane.parentId, insertLane, closeContextMenu]);

  const handleColorChange = useCallback(
    (hex: string | undefined) => {
      updateLane(lane.id, { color: hex });
      closeContextMenu();
    },
    [lane.id, updateLane, closeContextMenu]
  );

  // Lane drag-to-reorder handlers
  const handleLaneDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData("application/grid-lane-reorder", lane.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [lane.id]
  );

  const getDragPosition = useCallback(
    (e: DragEvent<HTMLDivElement>): 'before' | 'after' | 'child' => {
      const rect = laneRef.current?.getBoundingClientRect();
      if (!rect) return 'after';
      const y = e.clientY - rect.top;
      const height = rect.height;
      // Top 25% = before, bottom 25% = after, center 50% = make child
      if (y < height * 0.25) return 'before';
      if (y > height * 0.75) return 'after';
      return 'child';
    },
    []
  );

  const handleLaneDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (e.dataTransfer.types.includes("application/grid-lane-reorder")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverPosition(getDragPosition(e));
      }
    },
    [getDragPosition]
  );

  const handleLaneDragLeave = useCallback(() => {
    setDragOverPosition(null);
  }, []);

  const handleLaneDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const position = getDragPosition(e);
      setDragOverPosition(null);
      const sourceId = e.dataTransfer.getData("application/grid-lane-reorder");
      if (sourceId && sourceId !== lane.id) {
        reorderLanes(sourceId, lane.id, position);
      }
    },
    [lane.id, reorderLanes, getDragPosition]
  );

  const handleLaneDragEnd = useCallback(() => {
    setDragOverPosition(null);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeContextMenu();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu, closeContextMenu]);

  const darkMode = useWorkflowStore((s) => s.darkMode);
  const laneHex = lane.color;

  return (
    <>
      {/* This lane's row */}
      <div className="contents" role="row">
        {/* Lane label cell (sticky left, draggable for reorder) */}
        <div
          ref={laneRef}
          draggable={!editing}
          onDragStart={handleLaneDragStart}
          onDragOver={handleLaneDragOver}
          onDragLeave={handleLaneDragLeave}
          onDrop={handleLaneDrop}
          onDragEnd={handleLaneDragEnd}
          className={cn(
            "sticky left-0 z-10 flex items-center gap-1 px-2 py-2 group/lane",
            "bg-white dark:bg-zinc-950 border-r border-b border-slate-200 dark:border-zinc-800",
            "min-w-[120px] select-none cursor-grab active:cursor-grabbing",
            dragOverPosition === 'before' && "border-t-2 border-t-blue-500",
            dragOverPosition === 'after' && "border-b-2 border-b-blue-500",
            dragOverPosition === 'child' && "ring-2 ring-inset ring-green-500 bg-green-50 dark:bg-green-950"
          )}
          style={{
            paddingLeft: `${8 + depth * 16}px`,
            ...(laneHex ? {
              borderLeftWidth: "4px",
              borderLeftColor: laneHex,
              backgroundColor: darkMode ? laneHex + "20" : laneHex + "15",
            } : {}),
          }}
          onContextMenu={handleContextMenu}
        >
          {/* Drag handle */}
          <GripVertical className="w-3 h-3 text-slate-300 shrink-0 opacity-0 group-hover/lane:opacity-100 transition-opacity" />

          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0"
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
              className="px-1 py-0.5 text-xs font-medium border border-blue-400 rounded bg-white dark:bg-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500/30 min-w-[60px]"
            />
          ) : (
            <span
              onDoubleClick={() => setEditing(true)}
              className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate cursor-default"
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
            laneColor={laneHex}
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
          className="fixed z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRename}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Rename
          </button>
          <button
            onClick={handleAddSubLane}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Sub-lane
          </button>
          <hr className="my-1 border-slate-100 dark:border-zinc-700" />
          <button
            onClick={handleInsertAbove}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            Insert Above
          </button>
          <button
            onClick={handleInsertBelow}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            Insert Below
          </button>

          {/* Color submenu */}
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Color</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {LANE_COLORS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => handleColorChange(c.hex)}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-transform hover:scale-125",
                    lane.color === c.hex ? "border-slate-800 dark:border-white scale-110" : "border-slate-200 dark:border-zinc-600",
                  )}
                  style={{ backgroundColor: c.hex ?? (darkMode ? "#18181b" : "#ffffff") }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <hr className="my-1 border-slate-100 dark:border-zinc-700" />
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
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
