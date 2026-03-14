import { memo, useState, useCallback, useMemo, useRef, useEffect, type DragEvent } from "react";
import { Plus, Trash2, Edit3, GripHorizontal, ArrowLeft, ArrowRight, Bold, Palette, Type, ChevronRight, ChevronDown } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import type { StageDefinition } from "../../types/grid.ts";

const FONT_SIZES = [
  { label: "Small", value: 11 },
  { label: "Normal", value: undefined },
  { label: "Medium", value: 14 },
  { label: "Large", value: 16 },
  { label: "XL", value: 20 },
];

const STAGE_COLORS = [
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

interface ContextMenuState {
  x: number;
  y: number;
  stageId: string;
}

interface GridHeaderProps {
  stages: StageDefinition[];
  collapsedStageIds: Set<string>;
  onToggleCollapse: (stageId: string) => void;
}

function InlineEdit({
  value,
  onCommit,
  bold,
  textColor,
  fontSize,
  numberPrefix,
}: {
  value: string;
  onCommit: (newValue: string) => void;
  bold?: boolean;
  textColor?: string;
  fontSize?: number;
  numberPrefix?: string;
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
        style={{
          fontWeight: bold ? "bold" : undefined,
          color: textColor || undefined,
          fontSize: fontSize ? `${fontSize}px` : undefined,
        }}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className={cn(
        "truncate cursor-default select-none",
        !fontSize && "text-xs",
        !textColor && "text-slate-600 dark:text-slate-300",
        bold ? "font-bold" : "font-semibold",
      )}
      style={{
        color: textColor || undefined,
        fontSize: fontSize ? `${fontSize}px` : undefined,
      }}
      title="Double-click to rename"
    >
      {numberPrefix && <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mr-1">{numberPrefix}</span>}
      {value}
    </span>
  );
}

function GridHeader({ stages, collapsedStageIds, onToggleCollapse }: GridHeaderProps) {
  const updateStage = useWorkflowStore((s) => s.updateStage);
  const removeStage = useWorkflowStore((s) => s.removeStage);
  const addStage = useWorkflowStore((s) => s.addStage);
  const reorderStages = useWorkflowStore((s) => s.reorderStages);
  const insertStage = useWorkflowStore((s) => s.insertStage);
  const laneColumnWidth = useWorkflowStore((s) => s.gridConfig.laneColumnWidth);
  const setLaneColumnWidth = useWorkflowStore((s) => s.setLaneColumnWidth);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | 'child' | null>(null);
  const [resizing, setResizing] = useState<{ stageId: string; startX: number; startWidth: number } | null>(null);
  const [resizingLaneCol, setResizingLaneCol] = useState<{ startX: number; startWidth: number } | null>(null);

  // Build N-level stage tree and compute header cells
  interface HeaderCell {
    stage: StageDefinition;
    rowStart: number;
    rowSpan: number;
    colStart: number;
    colSpan: number;
    isLeaf: boolean;
    hasDataChildren: boolean;
    isCollapsed: boolean;
    isEmpty: boolean;
  }

  const { cells, headerRowCount } = useMemo(() => {
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const childMap = new Map<string, StageDefinition[]>();
    for (const stage of sorted) {
      if (stage.parentId) {
        const list = childMap.get(stage.parentId) ?? [];
        list.push(stage);
        childMap.set(stage.parentId, list);
      }
    }
    const topLevel = sorted.filter((s) => !s.parentId);

    interface TreeNode {
      stage: StageDefinition;
      children: TreeNode[];
      depth: number;
      leafCount: number;
      colStart: number;
    }

    let colCounter = 0;
    function buildNode(stage: StageDefinition, depth: number): TreeNode {
      const children = childMap.get(stage.id);
      const isCollapsed = collapsedStageIds.has(stage.id);
      if (!children || children.length === 0 || isCollapsed) {
        colCounter++;
        return { stage, children: [], depth, leafCount: 1, colStart: colCounter };
      }
      const childNodes = children.map(c => buildNode(c, depth + 1));
      const leafCount = childNodes.reduce((sum, n) => sum + n.leafCount, 0);
      return { stage, children: childNodes, depth, leafCount, colStart: childNodes[0].colStart };
    }

    const roots = topLevel.map(s => buildNode(s, 0));

    function getMaxDepth(nodes: TreeNode[]): number {
      if (nodes.length === 0) return 0;
      return Math.max(...nodes.map(n =>
        n.children.length === 0 ? n.depth : getMaxDepth(n.children)
      ));
    }
    const maxDepth = roots.length > 0 ? getMaxDepth(roots) : 0;
    const rowCount = maxDepth + 1;

    const cellList: HeaderCell[] = [];
    function visit(node: TreeNode) {
      const hasDataChildren = (childMap.get(node.stage.id)?.length ?? 0) > 0;
      const isCollapsed = collapsedStageIds.has(node.stage.id);
      const isLeaf = node.children.length === 0;
      cellList.push({
        stage: node.stage,
        rowStart: node.depth + 1,
        rowSpan: 1,
        colStart: node.colStart + 1, // +1 for lane label column
        colSpan: node.leafCount,
        isLeaf,
        hasDataChildren,
        isCollapsed,
        isEmpty: false,
      });
      // Leaf stages not at the deepest level: add blank placeholder cell(s) below
      if (isLeaf && node.depth < rowCount - 1) {
        cellList.push({
          stage: node.stage,
          rowStart: node.depth + 2,
          rowSpan: rowCount - node.depth - 1,
          colStart: node.colStart + 1,
          colSpan: 1,
          isLeaf: true,
          hasDataChildren: false,
          isCollapsed: false,
          isEmpty: true,
        });
      }
      for (const child of node.children) visit(child);
    }
    for (const root of roots) visit(root);

    return { cells: cellList, headerRowCount: rowCount };
  }, [stages, collapsedStageIds]);

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

  const handleInsertBefore = useCallback(() => {
    if (!contextMenu) return;
    const name = window.prompt("Stage name:");
    if (name?.trim()) {
      insertStage({ label: name.trim(), order: 0 }, contextMenu.stageId, "before");
    }
    closeContextMenu();
  }, [contextMenu, insertStage, closeContextMenu]);

  const handleInsertAfter = useCallback(() => {
    if (!contextMenu) return;
    const name = window.prompt("Stage name:");
    if (name?.trim()) {
      insertStage({ label: name.trim(), order: 0 }, contextMenu.stageId, "after");
    }
    closeContextMenu();
  }, [contextMenu, insertStage, closeContextMenu]);

  const handleColorChange = useCallback(
    (hex: string | undefined) => {
      if (!contextMenu) return;
      updateStage(contextMenu.stageId, { color: hex });
      closeContextMenu();
    },
    [contextMenu, updateStage, closeContextMenu]
  );

  const handleTextColorChange = useCallback(
    (hex: string | undefined) => {
      if (!contextMenu) return;
      updateStage(contextMenu.stageId, { textColor: hex });
      closeContextMenu();
    },
    [contextMenu, updateStage, closeContextMenu]
  );

  const handleBoldToggle = useCallback(() => {
    if (!contextMenu) return;
    const stage = stages.find((s) => s.id === contextMenu.stageId);
    if (!stage) return;
    updateStage(contextMenu.stageId, { bold: !stage.bold });
    closeContextMenu();
  }, [contextMenu, stages, updateStage, closeContextMenu]);

  const handleFontSizeChange = useCallback(
    (size: number | undefined) => {
      if (!contextMenu) return;
      updateStage(contextMenu.stageId, { fontSize: size });
      closeContextMenu();
    },
    [contextMenu, updateStage, closeContextMenu]
  );

  const darkMode = useWorkflowStore((s) => s.darkMode);

  // Stage drag-to-reorder handlers
  const handleStageDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, stageId: string) => {
      e.dataTransfer.setData("application/grid-stage-reorder", stageId);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const getStageDragPosition = useCallback(
    (e: DragEvent<HTMLDivElement>): 'before' | 'after' | 'child' => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      // Left 25% = before, right 25% = after, center 50% = make child
      if (x < width * 0.25) return 'before';
      if (x > width * 0.75) return 'after';
      return 'child';
    },
    []
  );

  const handleStageDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, stageId: string) => {
      if (e.dataTransfer.types.includes("application/grid-stage-reorder")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverStageId(stageId);
        setDragOverPosition(getStageDragPosition(e));
      }
    },
    [getStageDragPosition]
  );

  const handleStageDragLeave = useCallback(() => {
    setDragOverStageId(null);
    setDragOverPosition(null);
  }, []);

  const handleStageDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetId: string) => {
      e.preventDefault();
      const position = getStageDragPosition(e);
      setDragOverStageId(null);
      setDragOverPosition(null);
      const sourceId = e.dataTransfer.getData("application/grid-stage-reorder");
      if (sourceId && sourceId !== targetId) {
        reorderStages(sourceId, targetId, position);
      }
    },
    [reorderStages, getStageDragPosition]
  );

  const handleStageDragEnd = useCallback(() => {
    setDragOverStageId(null);
    setDragOverPosition(null);
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
      {/* Lane label header cell — spans all header rows */}
      <div
        className={cn(
          "sticky left-0 z-20 flex items-center px-3 py-2",
          "bg-slate-100 dark:bg-zinc-950 border-r border-b border-slate-300 dark:border-zinc-800",
          "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
        )}
        style={{
          gridRow: headerRowCount > 1 ? `1 / span ${headerRowCount}` : undefined,
          gridColumn: '1',
        }}
      >
        Lane
        <div
          onMouseDown={handleLaneColResizeStart}
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10",
            "hover:bg-blue-400/50",
            resizingLaneCol && "bg-blue-500/60"
          )}
        />
      </div>

      {/* Stage header cells (N-level) */}
      {cells.map((cell) => {
        // Empty placeholder cell below a leaf stage (blank row)
        if (cell.isEmpty) {
          return (
            <div
              key={`${cell.stage.id}-empty-${cell.rowStart}`}
              className="relative bg-slate-100 dark:bg-zinc-950 border-r border-b border-slate-300 dark:border-zinc-800"
              style={{
                gridRow: cell.rowSpan > 1 ? `${cell.rowStart} / span ${cell.rowSpan}` : `${cell.rowStart}`,
                gridColumn: `${cell.colStart}`,
              }}
            >
              <div
                onMouseDown={(e) => handleResizeStart(e, cell.stage.id, cell.stage.width ?? 150)}
                className={cn(
                  "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10",
                  "hover:bg-blue-400/50",
                  resizing?.stageId === cell.stage.id && "bg-blue-500/60"
                )}
              />
            </div>
          );
        }
        return (
          <div
            key={`${cell.stage.id}-${cell.rowStart}`}
            draggable={!resizing}
            onDragStart={(e) => handleStageDragStart(e, cell.stage.id)}
            onDragOver={(e) => handleStageDragOver(e, cell.stage.id)}
            onDragLeave={handleStageDragLeave}
            onDrop={(e) => handleStageDrop(e, cell.stage.id)}
            onDragEnd={handleStageDragEnd}
            className={cn(
              "relative flex items-center justify-center gap-1 px-2 group/stage",
              cell.isLeaf ? "py-2" : "py-1.5",
              "bg-slate-100 dark:bg-zinc-950 border-r border-b border-slate-300 dark:border-zinc-800",
              "min-w-[80px]",
              "cursor-grab active:cursor-grabbing",
              !cell.isLeaf && "uppercase tracking-wider",
              !cell.stage.fontSize && "text-xs",
              !cell.stage.textColor && "text-slate-500 dark:text-slate-400",
              cell.stage.bold ? "font-bold" : "font-semibold",
              dragOverStageId === cell.stage.id && dragOverPosition === 'before' && "border-l-2 border-l-blue-500",
              dragOverStageId === cell.stage.id && dragOverPosition === 'after' && "border-r-2 border-r-blue-500",
              dragOverStageId === cell.stage.id && dragOverPosition === 'child' && "ring-2 ring-inset ring-green-500 bg-green-50 dark:bg-green-950",
            )}
            style={{
              gridRow: cell.rowSpan > 1 ? `${cell.rowStart} / span ${cell.rowSpan}` : `${cell.rowStart}`,
              gridColumn: cell.colSpan > 1 ? `${cell.colStart} / span ${cell.colSpan}` : `${cell.colStart}`,
              color: cell.stage.textColor || undefined,
              fontSize: cell.stage.fontSize ? `${cell.stage.fontSize}px` : undefined,
              ...(cell.stage.color ? {
                borderBottomWidth: "3px",
                borderBottomColor: cell.stage.color,
                backgroundColor: darkMode ? cell.stage.color + "20" : cell.stage.color + "15",
              } : {}),
            }}
            onContextMenu={(e) => handleContextMenu(e, cell.stage.id)}
          >
            {cell.hasDataChildren && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleCollapse(cell.stage.id); }}
                className="shrink-0 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title={cell.isCollapsed ? "Expand" : "Collapse"}
              >
                {cell.isCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            )}
            <GripHorizontal className="w-3 h-3 text-slate-300 shrink-0 opacity-0 group-hover/stage:opacity-100 transition-opacity" />
            {cell.isLeaf ? (
              <InlineEdit
                value={cell.stage.label}
                onCommit={(newLabel) => updateStage(cell.stage.id, { label: newLabel })}
                bold={cell.stage.bold}
                textColor={cell.stage.textColor}
                fontSize={cell.stage.fontSize}
                numberPrefix={cell.stage.number}
              />
            ) : (
              <>
                {cell.stage.number && <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mr-1">{cell.stage.number}</span>}
                {cell.stage.label}
              </>
            )}
            {cell.isLeaf && (
              <div
                onMouseDown={(e) => handleResizeStart(e, cell.stage.id, cell.stage.width ?? 150)}
                className={cn(
                  "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10",
                  "hover:bg-blue-400/50",
                  resizing?.stageId === cell.stage.id && "bg-blue-500/60"
                )}
              />
            )}
          </div>
        );
      })}

      {/* Context menu */}
      {contextMenu && (() => {
        const menuStage = stages.find((s) => s.id === contextMenu.stageId);
        return (
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
              onClick={handleAddSubStage}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Sub-stage
            </button>
            <hr className="my-1 border-slate-100 dark:border-zinc-700" />
            <button
              onClick={handleInsertBefore}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Insert Before
            </button>
            <button
              onClick={handleInsertAfter}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Insert After
            </button>

            {/* Style section */}
            <div className="px-3 py-1.5 space-y-2">
              {/* Bold toggle + Size */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBoldToggle}
                  className={cn(
                    "flex items-center gap-1.5 px-1.5 py-1 text-sm rounded transition-colors",
                    menuStage?.bold
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  )}
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span className="text-xs">Bold</span>
                </button>
                <div className="flex items-center gap-0.5 ml-auto">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleFontSizeChange(s.value)}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] rounded transition-colors",
                        (menuStage?.fontSize ?? undefined) === s.value
                          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold"
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                      )}
                      title={s.label}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background color */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Color</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {STAGE_COLORS.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => handleColorChange(c.hex)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-transform hover:scale-125",
                        menuStage?.color === c.hex ? "border-slate-800 dark:border-white scale-110" : "border-slate-200 dark:border-zinc-600",
                      )}
                      style={{ backgroundColor: c.hex ?? (darkMode ? "#18181b" : "#ffffff") }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Text color */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Type className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Text Color</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {STAGE_COLORS.map((c) => (
                    <button
                      key={`text-${c.label}`}
                      onClick={() => handleTextColorChange(c.hex)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-transform hover:scale-125",
                        menuStage?.textColor === c.hex ? "border-slate-800 dark:border-white scale-110" : "border-slate-200 dark:border-zinc-600",
                      )}
                      style={{ backgroundColor: c.hex ?? (darkMode ? "#18181b" : "#ffffff") }}
                      title={c.label}
                    />
                  ))}
                </div>
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
        );
      })()}
    </>
  );
}

export default memo(GridHeader);
