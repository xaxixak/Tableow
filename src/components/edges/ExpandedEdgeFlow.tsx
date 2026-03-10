import { useState, useCallback, useMemo, useRef, useEffect, type DragEvent } from "react";
import { Plus, X, GripVertical, ArrowRight, Search, ChevronUp } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import type { EdgeSubStep } from "../../types/index.ts";

interface ExpandedEdgeFlowProps {
  edgeId: string;
  onClose?: () => void;
}

export function ExpandedEdgeFlow({ edgeId, onClose }: ExpandedEdgeFlowProps) {
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateEdge = useWorkflowStore((s) => s.updateEdge);

  const edge = edges.find((e) => e.id === edgeId);
  const sourceNode = nodes.find((n) => n.id === edge?.source);
  const targetNode = nodes.find((n) => n.id === edge?.target);

  const subSteps = edge?.data?.subSteps ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [nodeDropIndex, setNodeDropIndex] = useState<number | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const availableNodes = useMemo(() => {
    return nodes.filter(
      (n) => n.id !== edge?.source && n.id !== edge?.target
    );
  }, [nodes, edge?.source, edge?.target]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return availableNodes;
    const q = searchQuery.toLowerCase();
    return availableNodes.filter((n) => {
      const label = (n.data?.label || "").toLowerCase();
      const type = (n.data?.definitionType || "").toLowerCase();
      return label.includes(q) || type.includes(q);
    });
  }, [availableNodes, searchQuery]);

  useEffect(() => {
    if (editingStepId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingStepId]);

  const updateSubSteps = useCallback(
    (newSteps: EdgeSubStep[]) => {
      updateEdge(edgeId, { subSteps: newSteps });
    },
    [edgeId, updateEdge]
  );

  const handleAddNodeStep = useCallback(
    (atIndex: number, nodeId: string, label: string) => {
      const newStep: EdgeSubStep = {
        id: crypto.randomUUID(),
        label,
        nodeId,
        order: atIndex,
      };
      const updated = [...subSteps];
      updated.splice(atIndex, 0, newStep);
      const reindexed = updated.map((s, i) => ({ ...s, order: i }));
      updateSubSteps(reindexed);
    },
    [subSteps, updateSubSteps]
  );

  const handleRemoveStep = useCallback(
    (stepId: string) => {
      const updated = subSteps
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i }));
      updateSubSteps(updated);
    },
    [subSteps, updateSubSteps]
  );

  const handleEditCommit = useCallback(
    (stepId: string) => {
      const trimmed = editValue.trim();
      if (!trimmed) {
        setEditingStepId(null);
        return;
      }
      const updated = subSteps.map((s) =>
        s.id === stepId ? { ...s, label: trimmed } : s
      );
      updateSubSteps(updated);
      setEditingStepId(null);
    },
    [editValue, subSteps, updateSubSteps]
  );

  const startEditing = useCallback((step: EdgeSubStep) => {
    setEditingStepId(step.id);
    setEditValue(step.label);
  }, []);

  // ── Drag-to-reorder existing steps ──
  const handleReorderDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, index: number) => {
      e.dataTransfer.setData("application/edge-step-reorder", String(index));
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleReorderDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, index: number) => {
      if (e.dataTransfer.types.includes("application/edge-step-reorder")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
      }
    },
    []
  );

  const handleReorderDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleReorderDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      const sourceIndex = Number(e.dataTransfer.getData("application/edge-step-reorder"));
      if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

      const updated = [...subSteps];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      const reindexed = updated.map((s, i) => ({ ...s, order: i }));
      updateSubSteps(reindexed);
    },
    [subSteps, updateSubSteps]
  );

  const handleReorderDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  // ── Drag node from palette into flow ──
  const handleNodeDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, nodeId: string, label: string) => {
      e.dataTransfer.setData("application/edge-node-add", JSON.stringify({ nodeId, label }));
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  const handleDropZoneDragOver = useCallback(
    (e: DragEvent<HTMLButtonElement>, index: number) => {
      if (e.dataTransfer.types.includes("application/edge-node-add")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setNodeDropIndex(index);
      }
    },
    []
  );

  const handleDropZoneDragLeave = useCallback(() => {
    setNodeDropIndex(null);
  }, []);

  const handleDropZoneDrop = useCallback(
    (e: DragEvent<HTMLButtonElement>, index: number) => {
      e.preventDefault();
      setNodeDropIndex(null);
      const raw = e.dataTransfer.getData("application/edge-node-add");
      if (!raw) return;
      try {
        const { nodeId, label } = JSON.parse(raw) as { nodeId: string; label: string };
        handleAddNodeStep(index, nodeId, label);
      } catch {
        // ignore malformed data
      }
    },
    [handleAddNodeStep]
  );

  const handleDropZoneDragEnd = useCallback(() => {
    setNodeDropIndex(null);
  }, []);

  if (!edge || !sourceNode || !targetNode) return null;

  const sourceName = sourceNode.data?.label || sourceNode.type || "Source";
  const targetName = targetNode.data?.label || targetNode.type || "Target";
  const sortedSteps = [...subSteps].sort((a, b) => a.order - b.order);
  const edgeNumber = edge.data?.number || "E";

  const dropZone = (index: number) => (
    <button
      key={`drop-${index}`}
      onDragOver={(e) => handleDropZoneDragOver(e, index)}
      onDragLeave={handleDropZoneDragLeave}
      onDrop={(e) => handleDropZoneDrop(e, index)}
      onDragEnd={handleDropZoneDragEnd}
      className={cn(
        "flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-all",
        nodeDropIndex === index
          ? "w-7 h-7 border-2 border-solid border-amber-500 bg-amber-100 text-amber-600 scale-110"
          : "border-2 border-dashed border-slate-300 dark:border-zinc-600 text-slate-400 dark:text-zinc-500 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:border-amber-500 dark:hover:bg-amber-900/20"
      )}
      title="Drop a node here"
    >
      <Plus className="w-2.5 h-2.5" />
    </button>
  );

  const arrow = (
    <ArrowRight className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600 shrink-0" />
  );

  return (
    <div
      className="bg-white dark:bg-zinc-800 border-2 border-amber-400 dark:border-amber-600 rounded-xl shadow-lg p-3 min-w-[200px] max-w-[600px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500 text-white text-[10px] font-bold shrink-0">
          {edgeNumber}
        </div>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
          {sourceName}
        </span>
        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
          {targetName}
        </span>
        <span className="ml-auto text-[10px] text-slate-400 dark:text-zinc-500">
          {sortedSteps.length} step{sortedSteps.length !== 1 ? "s" : ""}
        </span>
        {/* Collapse button */}
        <button
          onClick={() => onClose?.()}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 transition-colors"
          title="Collapse"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Flow visualization */}
      <div className="flex items-center gap-1.5 flex-wrap py-2 min-h-[40px]">
        {/* Source chip */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[11px] font-medium text-green-800 dark:text-green-300">{sourceName}</span>
        </div>

        {arrow}
        {dropZone(0)}

        {/* Steps */}
        {sortedSteps.map((step, i) => (
          <div key={step.id} className="contents">
            {arrow}

            {/* Step card */}
            <div
              draggable={editingStepId !== step.id}
              onDragStart={(e) => handleReorderDragStart(e, i)}
              onDragOver={(e) => handleReorderDragOver(e, i)}
              onDragLeave={handleReorderDragLeave}
              onDrop={(e) => handleReorderDrop(e, i)}
              onDragEnd={handleReorderDragEnd}
              className={cn(
                "relative flex items-center gap-1 px-2 py-1 rounded-md group/step shrink-0",
                "bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700",
                "cursor-grab active:cursor-grabbing",
                "hover:shadow-sm transition-shadow",
                dragOverIndex === i && "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
              )}
            >
              <GripVertical className="w-2.5 h-2.5 text-amber-300 dark:text-amber-700 shrink-0 opacity-0 group-hover/step:opacity-100 transition-opacity" />

              {editingStepId === step.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleEditCommit(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditCommit(step.id);
                    if (e.key === "Escape") setEditingStepId(null);
                  }}
                  className="px-1 py-0.5 text-[11px] border border-amber-400 rounded bg-white dark:bg-zinc-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 min-w-[60px]"
                />
              ) : (
                <span
                  onDoubleClick={() => startEditing(step)}
                  className="text-[11px] font-medium text-amber-900 dark:text-amber-200 cursor-default select-none"
                  title="Double-click to edit"
                >
                  {step.label}
                </span>
              )}

              {/* Delete button */}
              <button
                onClick={() => handleRemoveStep(step.id)}
                className="ml-0.5 p-0.5 rounded text-amber-300 hover:text-red-500 hover:bg-red-50 dark:text-amber-700 dark:hover:text-red-400 dark:hover:bg-red-900/20 opacity-0 group-hover/step:opacity-100 transition-all"
                title="Remove step"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>

            {arrow}
            {dropZone(i + 1)}
          </div>
        ))}

        {arrow}

        {/* Target chip */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[11px] font-medium text-red-800 dark:text-red-300">{targetName}</span>
        </div>
      </div>

      {/* Toggle palette */}
      <div className="mt-1 pt-2 border-t border-amber-200 dark:border-amber-800">
        <button
          onClick={() => setShowPalette(!showPalette)}
          className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          {showPalette ? "Hide nodes" : "Add nodes..."}
        </button>

        {showPalette && (
          <div className="mt-2">
            {/* Search */}
            <div className="relative mb-1.5">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className={cn(
                  "w-full pl-7 pr-2 py-1 text-[11px] rounded-md border border-slate-200",
                  "bg-white dark:bg-zinc-700 dark:border-zinc-600 dark:text-slate-200",
                  "focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-400"
                )}
              />
            </div>

            {/* Node list */}
            <div className="max-h-[120px] overflow-y-auto rounded-md border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-700">
              {filteredNodes.length === 0 ? (
                <div className="px-2 py-3 text-center text-[10px] text-slate-400 dark:text-zinc-500">
                  {availableNodes.length === 0 ? "No other nodes" : "No matching nodes"}
                </div>
              ) : (
                filteredNodes.slice(0, 20).map((node) => {
                  const label = node.data?.label || node.type || "Node";
                  return (
                    <div
                      key={node.id}
                      draggable
                      onDragStart={(e) => handleNodeDragStart(e, node.id, label)}
                      className={cn(
                        "flex items-center gap-1.5 w-full px-2 py-1.5 text-left text-[11px]",
                        "hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors",
                        "border-b border-slate-100 dark:border-zinc-600 last:border-b-0",
                        "cursor-grab active:cursor-grabbing select-none"
                      )}
                    >
                      <GripVertical className="w-2.5 h-2.5 text-slate-300 dark:text-zinc-600 shrink-0" />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                        {label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
