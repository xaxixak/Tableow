import { useMemo, useCallback, useState, useEffect, type DragEvent } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { nodeRegistry } from "../../registry/index.ts";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import type { WorkflowNode } from "../../types/index.ts";

const CATEGORY_COLORS: Record<string, string> = {
  input: "bg-emerald-600",
  processing: "bg-violet-600",
  output: "bg-amber-600",
  logic: "bg-sky-600",
  integration: "bg-rose-600",
  General: "bg-slate-600",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-slate-600";
}

interface GridNodeProps {
  node: WorkflowNode;
}

interface ContextMenuState {
  x: number;
  y: number;
}

function GridNode({ node }: GridNodeProps) {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const registryVersion = useWorkflowStore((s) => s.registryVersion);

  const isSelected = selectedNodeId === node.id;
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const definition = useMemo(() => {
    return node.type ? nodeRegistry.get(node.type) : undefined;
  }, [node.type, registryVersion]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(node.id);
    },
    [node.id, selectNode]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectNode(node.id);
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [node.id, selectNode]
  );

  const handleDelete = useCallback(() => {
    setContextMenu(null);
    if (window.confirm(`Delete "${node.data.label ?? "node"}"?`)) {
      removeNode(node.id);
    }
  }, [node.id, node.data.label, removeNode]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeContextMenu();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu, closeContextMenu]);

  // Drag to move between cells
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData("application/grid-node-move", node.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [node.id]
  );

  const label = (node.data.label as string) ?? definition?.label ?? node.type ?? "Node";
  const icon = definition?.icon;
  const category = definition?.category ?? "processing";
  const categoryColor = definition?.color ?? getCategoryColor(category);
  const inputCount = definition?.inputs?.length ?? 0;
  const outputCount = definition?.outputs?.length ?? 0;

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        data-node-id={node.id}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md flex-1 group",
          "bg-white border border-slate-200 shadow-sm",
          "text-left w-full min-w-0 cursor-pointer",
          "hover:shadow-md transition-shadow duration-100",
          isSelected && "ring-2 ring-blue-500 border-blue-300 shadow-md"
        )}
        role="button"
        tabIndex={0}
        aria-label={`Node: ${label}`}
        aria-pressed={isSelected}
      >
        {/* Input port indicators */}
        {inputCount > 0 && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex flex-col gap-1">
            {Array.from({ length: inputCount }).map((_, i) => (
              <span
                key={`in-${i}`}
                className="block w-2 h-2 rounded-full bg-slate-400 border border-slate-500"
              />
            ))}
          </div>
        )}

        {/* Drag handle */}
        <GripVertical className="w-3 h-3 text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />

        {/* Icon */}
        {icon && (
          <span
            className={cn(
              "flex items-center justify-center w-5 h-5 rounded text-white text-xs leading-none shrink-0",
              categoryColor
            )}
          >
            {icon}
          </span>
        )}

        {/* Label */}
        <span className="text-xs font-medium text-slate-700 truncate flex-1">
          {label}
        </span>

        {/* Delete button on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="p-0.5 text-slate-300 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete node"
        >
          <Trash2 className="w-3 h-3" />
        </button>

        {/* Output port indicators */}
        {outputCount > 0 && (
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1">
            {Array.from({ length: outputCount }).map((_, i) => (
              <span
                key={`out-${i}`}
                className="block w-2 h-2 rounded-full bg-slate-400 border border-slate-500"
              />
            ))}
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
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

export default GridNode;
