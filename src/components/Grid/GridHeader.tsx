import { memo, useState, useCallback, useMemo, useRef, useEffect, type DragEvent } from "react";
import { Plus, Trash2, Edit3, GripHorizontal } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import type { StageDefinition } from "../../types/grid.ts";

interface ContextMenuState {
  x: number;
  y: number;
  stageId: string;
}

interface GridHeaderProps {
  stages: StageDefinition[];
}

function InlineEdit({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onCommit(trimmed);
    } else {
      setEditValue(value);
    }
  }, [editValue, value, onCommit]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setEditValue(value);
            setEditing(false);
          }
        }}
        className="px-1 py-0.5 text-xs font-semibold border border-blue-400 rounded bg-white dark:bg-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500/30 w-full min-w-[60px]"
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate cursor-default select-none"
      title="Double-click to rename"
    >
      {value}
    </span>
  );
}

function GridHeader({ stages }: GridHeaderProps) {
  const updateStage = useWorkflowStore((s) => s.updateStage);
  const removeStage = useWorkflowStore((s) => s.removeStage);
  const addStage = useWorkflowStore((s) => s.addStage);
  const reorderStages = useWorkflowStore((s) => s.reorderStages);
  const laneColumnWidth = useWorkflowStore((s) => s.gridConfig.laneColumnWidth);
  const setLaneColumnWidth = useWorkflowStore((s) => s.setLaneColumnWidth);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ stageId: string; startX: number; startWidth: number } | null>(null);
  const [resizingLaneCol, setResizingLaneCol] = useState<{ startX: number; startWidth: number } | null>(null);

  // Build hierarchical stage structure
  const { parentStages, childrenByParent, topLevelStages } = useMemo(() => {
    const parents: StageDefinition[] = [];
    const children = new Map<string, StageDefinition[]>();
    const topLevel: StageDefinition[] = [];

    const sorted = [...stages].sort((a, b) => a.order - b.order);

    for (const stage of sorted) {
      if (stage.parentId) {
        const list = children.get(stage.parentId) ?? [];
        list.push(stage);
        children.set(stage.parentId, list);
      } else {
        topLevel.push(stage);
      }
    }

    // Parents are top-level stages that have children
    for (const stage of topLevel) {
      if (children.has(stage.id)) {
        parents.push(stage);
      }
    }

    return { parentStages: parents, childrenByParent: children, topLevelStages: topLevel };
  }, [stages]);

  // Flat list of leaf columns (for grid alignment)
  const leafColumns = useMemo(() => {
    const leaves: StageDefinition[] = [];
    for (const stage of topLevelStages) {
      const children = childrenByParent.get(stage.id);
      if (children && children.length > 0) {
        leaves.push(...children);
      } else {
        leaves.push(stage);
      }
    }
    return leaves;
  }, [topLevelStages, childrenByParent]);

  const hasHierarchy = parentStages.length > 0;

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, stageId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, stageId });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleRename = useCallback(() => {
    if (!contextMenu) return;
    const stage = stages.find((s) => s.id === contextMenu.stageId);
    if (!stage) return;
    const newName = window.prompt("Rename stage:", stage.label);
    if (newName?.trim()) {
      updateStage(contextMenu.stageId, { label: newName.trim() });
    }
    closeContextMenu();
  }, [contextMenu, stages, updateStage, closeContextMenu]);

  const handleDelete = useCallback(() => {
    if (!contextMenu) return;
    if (window.confirm("Delete this stage?")) {
      removeStage(contextMenu.stageId);
    }
    closeContextMenu();
  }, [contextMenu, removeStage, closeContextMenu]);

  const handleAddSubStage = useCallback(() => {
    if (!contextMenu) return;
    const name = window.prompt("Sub-stage name:");
    if (name?.trim()) {
      const maxOrder = stages.reduce((max, s) => Math.max(max, s.order), 0);
      addStage({ label: name.trim(), parentId: contextMenu.stageId, order: maxOrder + 1 });
    }
    closeContextMenu();
  }, [contextMenu, stages, addStage, closeContextMenu]);

  // Stage drag-to-reorder handlers
  const handleStageDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, stageId: string) => {
      e.dataTransfer.setData("application/grid-stage-reorder", stageId);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleStageDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, stageId: string) => {
      if (e.dataTransfer.types.includes("application/grid-stage-reorder")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverStageId(stageId);
      }
    },
    []
  );

  const handleStageDragLeave = useCallback(() => {
    setDragOverStageId(null);
  }, []);

  const handleStageDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetId: string) => {
      e.preventDefault();
      setDragOverStageId(null);
      const sourceId = e.dataTransfer.getData("application/grid-stage-reorder");
      if (sourceId && sourceId !== targetId) {
        reorderStages(sourceId, targetId);
      }
    },
    [reorderStages]
  );

  const handleStageDragEnd = useCallback(() => {
    setDragOverStageId(null);
  }, []);

  // Column resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, stageId: string, currentWidth: number) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing({ stageId, startX: e.clientX, startWidth: currentWidth });
    },
    []
  );

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizing.startX;
      const newWidth = Math.max(80, resizing.startWidth + delta);
      updateStage(resizing.stageId, { width: newWidth });
    };
    const handleMouseUp = () => {
      setResizing(null);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, updateStage]);

  // Lane column resize handlers
  const handleLaneColResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingLaneCol({ startX: e.clientX, startWidth: laneColumnWidth ?? 120 });
    },
    [laneColumnWidth]
  );

  useEffect(() => {
    if (!resizingLaneCol) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizingLaneCol.startX;
      const newWidth = Math.max(80, resizingLaneCol.startWidth + delta);
      setLaneColumnWidth(newWidth);
    };
    const handleMouseUp = () => {
      setResizingLaneCol(null);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingLaneCol, setLaneColumnWidth]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeContextMenu();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu, closeContextMenu]);

  return (
    <>
      {/* Parent header row (if hierarchical) */}
      {hasHierarchy && (
        <div className="contents" role="row">
          {/* Empty cell for lane label column */}
          <div className="sticky left-0 z-20 bg-slate-100 dark:bg-zinc-950 border-r border-b border-slate-300 dark:border-zinc-800">
            <div
              onMouseDown={handleLaneColResizeStart}
              className={cn(
                "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10",
                "hover:bg-blue-400/50",
                resizingLaneCol && "bg-blue-500/60"
              )}
            />
          </div>

          {topLevelStages.map((stage) => {
            const children = childrenByParent.get(stage.id);
            const span = children ? children.length : 1;

            return (
              <div
                key={stage.id}
                draggable
                onDragStart={(e) => handleStageDragStart(e, stage.id)}
                onDragOver={(e) => handleStageDragOver(e, stage.id)}
                onDragLeave={handleStageDragLeave}
                onDrop={(e) => handleStageDrop(e, stage.id)}
                onDragEnd={handleStageDragEnd}
                className={cn(
                  "flex items-center justify-center gap-1 px-2 py-1.5 group/parent",
                  "bg-slate-100 dark:bg-zinc-950 border-r border-b border-slate-300 dark:border-zinc-800",
                  "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider",
                  "cursor-grab active:cursor-grabbing",
                  dragOverStageId === stage.id && "border-l-2 border-l-blue-500 bg-blue-50 dark:bg-blue-950"
                )}
                style={{
                  gridColumn: `span ${span}`,
                }}
                onContextMenu={(e) => handleContextMenu(e, stage.id)}
              >
                {children && (
                  <>
                    <GripHorizontal className="w-3 h-3 text-slate-300 shrink-0 opacity-0 group-hover/parent:opacity-100 transition-opacity" />
                    {stage.label}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Leaf column header row */}
      <div className="contents" role="row">
        {/* Lane label header */}
        <div
          className={cn(
            "sticky left-0 z-20 flex items-center px-3 py-2",
            "bg-slate-100 dark:bg-zinc-950 border-r border-b border-slate-300 dark:border-zinc-800",
            "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
          )}
        >
          Lane
          {/* Resize handle for lane column */}
          <div
            onMouseDown={handleLaneColResizeStart}
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10",
              "hover:bg-blue-400/50",
              resizingLaneCol && "bg-blue-500/60"
            )}
          />
        </div>

        {leafColumns.map((stage) => (
          <div
            key={stage.id}
            draggable={!resizing}
            onDragStart={(e) => handleStageDragStart(e, stage.id)}
            onDragOver={(e) => handleStageDragOver(e, stage.id)}
            onDragLeave={handleStageDragLeave}
            onDrop={(e) => handleStageDrop(e, stage.id)}
            onDragEnd={handleStageDragEnd}
            className={cn(
              "relative flex items-center justify-center gap-1 px-2 py-2 group/stage",
              "bg-slate-100 dark:bg-zinc-950 border-r border-b border-slate-300 dark:border-zinc-800",
              "min-w-[80px] cursor-grab active:cursor-grabbing",
              dragOverStageId === stage.id && "border-l-2 border-l-blue-500 bg-blue-50 dark:bg-blue-950"
            )}
            onContextMenu={(e) => handleContextMenu(e, stage.id)}
          >
            <GripHorizontal className="w-3 h-3 text-slate-300 shrink-0 opacity-0 group-hover/stage:opacity-100 transition-opacity" />
            <InlineEdit
              value={stage.label}
              onCommit={(newLabel) => updateStage(stage.id, { label: newLabel })}
            />
            {/* Resize handle */}
            <div
              onMouseDown={(e) => handleResizeStart(e, stage.id, stage.width ?? 150)}
              className={cn(
                "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10",
                "hover:bg-blue-400/50",
                resizing?.stageId === stage.id && "bg-blue-500/60"
              )}
            />
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[160px]"
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
            onClick={handleAddSubStage}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Sub-stage
          </button>
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

export default memo(GridHeader);
