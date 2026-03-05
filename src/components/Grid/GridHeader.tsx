import { memo, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, Edit3 } from "lucide-react";
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
        className="px-1 py-0.5 text-xs font-semibold border border-blue-400 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 w-full min-w-[60px]"
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className="text-xs font-semibold text-slate-600 truncate cursor-default select-none"
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

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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
          <div className="sticky left-0 z-20 bg-slate-100 border-r border-b border-slate-300" />

          {topLevelStages.map((stage) => {
            const children = childrenByParent.get(stage.id);
            const span = children ? children.length : 1;

            return (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center justify-center px-2 py-1.5",
                  "bg-slate-100 border-r border-b border-slate-300",
                  "text-xs font-semibold text-slate-500 uppercase tracking-wider"
                )}
                style={{
                  gridColumn: `span ${span}`,
                }}
                onContextMenu={(e) => handleContextMenu(e, stage.id)}
              >
                {children ? stage.label : ""}
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
            "bg-slate-100 border-r border-b border-slate-300",
            "text-xs font-semibold text-slate-500 uppercase tracking-wider"
          )}
        >
          Lane
        </div>

        {leafColumns.map((stage) => (
          <div
            key={stage.id}
            className={cn(
              "flex items-center justify-center px-2 py-2",
              "bg-slate-100 border-r border-b border-slate-300",
              "min-w-[150px]"
            )}
            onContextMenu={(e) => handleContextMenu(e, stage.id)}
          >
            <InlineEdit
              value={stage.label}
              onCommit={(newLabel) => updateStage(stage.id, { label: newLabel })}
            />
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
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
            onClick={handleAddSubStage}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Sub-stage
          </button>
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

export default memo(GridHeader);
