import { useMemo, useCallback, useState, useEffect, useRef, type DragEvent } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { nodeRegistry } from "../../registry/index.ts";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import { getColorByIndex } from "../../lib/categoryColors.ts";
import type { WorkflowNode } from "../../types/index.ts";

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
  const toggleNodeSelection = useWorkflowStore((s) => s.toggleNodeSelection);
  const selectedNodeIds = useWorkflowStore((s) => s.selectedNodeIds);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const addEdge = useWorkflowStore((s) => s.addEdge);
  const registryVersion = useWorkflowStore((s) => s.registryVersion);
  const isCreatingConnection = useWorkflowStore((s) => s.isCreatingConnection);
  const setIsCreatingConnection = useWorkflowStore((s) => s.setIsCreatingConnection);

  const isSelected = selectedNodeId === node.id;
  const isMultiSelected = selectedNodeIds.has(node.id);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isConnectionDragTarget, setIsConnectionDragTarget] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const definition = useMemo(() => {
    return node.type ? nodeRegistry.get(node.type) : undefined;
  }, [node.type, registryVersion]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        toggleNodeSelection(node.id);
      } else {
        selectNode(node.id);
      }
    },
    [node.id, selectNode, toggleNodeSelection]
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

  // Drag to move between cells (supports multi-select)
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      // Don't drag node if currently dragging a connection
      if (isCreatingConnection) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // If this node is part of a multi-selection, send all selected IDs
      const ids = selectedNodeIds.has(node.id) && selectedNodeIds.size > 1
        ? JSON.stringify([...selectedNodeIds])
        : node.id;
      e.dataTransfer.setData("application/grid-node-move", ids);
      e.dataTransfer.effectAllowed = "move";
    },
    [node.id, isCreatingConnection, selectedNodeIds]
  );

  // Connection drag handlers
  const handleConnectionDragStart = useCallback(
    (e: DragEvent<HTMLSpanElement>, outputIndex: number) => {
      e.stopPropagation(); // Don't trigger node drag
      setIsCreatingConnection(true);
      const outputPort = definition?.outputs?.[outputIndex];
      const handleId = outputPort?.name || `out_${outputIndex + 1}`;
      e.dataTransfer.setData("application/grid-connection-source", node.id);
      e.dataTransfer.setData("application/grid-connection-handle", handleId);
      e.dataTransfer.effectAllowed = "link";
    },
    [node.id, definition, setIsCreatingConnection]
  );

  const handleConnectionDragOver = useCallback(
    (e: DragEvent<HTMLSpanElement>) => {
      if (e.dataTransfer.types.includes("application/grid-connection-source")) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "link";
        setIsConnectionDragTarget(true);
      }
    },
    []
  );

  const handleConnectionDragLeave = useCallback(() => {
    setIsConnectionDragTarget(false);
  }, []);

  const handleConnectionDragEnd = useCallback(() => {
    // Clear drag target state when drag ends (whether successful or not)
    setIsCreatingConnection(false);
    setIsConnectionDragTarget(false);
  }, [setIsCreatingConnection]);

  const handleConnectionDrop = useCallback(
    (e: DragEvent<HTMLSpanElement>, inputIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setIsCreatingConnection(false);
      setIsConnectionDragTarget(false);

      const sourceNodeId = e.dataTransfer.getData("application/grid-connection-source");
      const sourceHandle = e.dataTransfer.getData("application/grid-connection-handle");

      if (!sourceNodeId || sourceNodeId === node.id) {
        return; // Can't connect to self
      }

      const inputPort = definition?.inputs?.[inputIndex];
      const targetHandle = inputPort?.name || `in_${inputIndex + 1}`;

      // Create the edge
      addEdge({
        source: sourceNodeId,
        sourceHandle: sourceHandle || undefined,
        target: node.id,
        targetHandle: targetHandle,
      });
    },
    [node.id, addEdge, definition, setIsCreatingConnection]
  );

  const darkMode = useWorkflowStore((s) => s.darkMode);
  const customCategories = useWorkflowStore((s) => s.customCategories);
  const label = (node.data.label as string) ?? definition?.label ?? node.type ?? "Node";
  const icon = definition?.icon;
  const category = definition?.category ?? "processing";
  const catDef = customCategories.find((c) => c.path === category);
  const catColor = getColorByIndex(catDef?.colorIndex);
  const inputCount = definition?.inputs?.length ?? 0;
  const outputCount = definition?.outputs?.length ?? 0;

  return (
    <>
      <div
        ref={nodeRef}
        draggable
        onDragStart={handleDragStart}
        data-node-id={node.id}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "relative flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-md flex-1 group",
          "border border-slate-200 dark:border-zinc-700 shadow-sm",
          "text-left w-full min-w-0 cursor-pointer",
          "hover:shadow-md transition-shadow duration-100",
          isSelected && "ring-2 ring-blue-500 border-blue-300 shadow-md",
          !isSelected && isMultiSelected && "ring-2 ring-blue-300 border-blue-200 bg-blue-50/60 dark:ring-blue-600 dark:border-blue-700 dark:bg-blue-950/40",
          isConnectionDragTarget && "ring-2 ring-green-500 border-green-300"
        )}
        style={{
          borderLeftWidth: "4px",
          borderLeftColor: catColor.hex,
          backgroundColor: darkMode ? catColor.darkBgHex : catColor.bgHex,
        }}
        role="button"
        tabIndex={0}
        aria-label={`Node: ${label}`}
        aria-pressed={isSelected}
      >
        {/* Input port indicators - droppable */}
        {inputCount > 0 && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex flex-col gap-1">
            {Array.from({ length: inputCount }).map((_, i) => (
              <span
                key={`in-${i}`}
                onDragOver={handleConnectionDragOver}
                onDragLeave={handleConnectionDragLeave}
                onDrop={(e) => handleConnectionDrop(e, i)}
                className={cn(
                  "block w-2 h-2 rounded-full bg-slate-400 border border-slate-500",
                  "hover:bg-green-400 hover:border-green-600 hover:scale-125 transition-all cursor-crosshair"
                )}
                title="Drop connection here"
              />
            ))}
          </div>
        )}

        {/* Drag handle */}
        <GripVertical className="w-3 h-3 text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />

        {/* Icon */}
        {icon && (
          <span
            className="flex items-center justify-center w-5 h-5 rounded text-white text-xs leading-none shrink-0"
            style={{ backgroundColor: catColor.hex }}
          >
            {icon}
          </span>
        )}

        {/* Label + number */}
        <span className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-medium text-slate-700 truncate">{label}</span>
          {definition?.number && (
            <span className="text-[10px] text-slate-400 truncate opacity-60">{definition.number}</span>
          )}
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

        {/* Output port indicators - draggable */}
        {outputCount > 0 && (
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1">
            {Array.from({ length: outputCount }).map((_, i) => (
              <span
                key={`out-${i}`}
                draggable
                onDragStart={(e) => handleConnectionDragStart(e, i)}
                onDragEnd={handleConnectionDragEnd}
                className={cn(
                  "block w-2 h-2 rounded-full bg-slate-400 border border-slate-500",
                  "hover:bg-blue-400 hover:border-blue-600 hover:scale-125 transition-all cursor-crosshair"
                )}
                title="Drag to connect"
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
