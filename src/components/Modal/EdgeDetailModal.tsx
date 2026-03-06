import { useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import { Plus, X, GripVertical, ArrowRight } from "lucide-react";
import { Modal } from "./Modal";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import type { EdgeSubStep } from "../../types/index.ts";

interface EdgeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  edgeId: string;
}

export function EdgeDetailModal({ isOpen, onClose, edgeId }: EdgeDetailModalProps) {
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateEdge = useWorkflowStore((s) => s.updateEdge);

  const edge = edges.find((e) => e.id === edgeId);
  const sourceNode = nodes.find((n) => n.id === edge?.source);
  const targetNode = nodes.find((n) => n.id === edge?.target);

  const subSteps = edge?.data?.subSteps ?? [];

  const [addingAtIndex, setAddingAtIndex] = useState<number | null>(null);
  const [newStepLabel, setNewStepLabel] = useState("");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingAtIndex !== null) {
      addInputRef.current?.focus();
    }
  }, [addingAtIndex]);

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

  const handleAddStep = useCallback(
    (atIndex: number) => {
      const trimmed = newStepLabel.trim();
      if (!trimmed) {
        setAddingAtIndex(null);
        setNewStepLabel("");
        return;
      }

      const newStep: EdgeSubStep = {
        id: crypto.randomUUID(),
        label: trimmed,
        order: atIndex,
      };

      // Insert at position and reindex
      const updated = [...subSteps];
      updated.splice(atIndex, 0, newStep);
      const reindexed = updated.map((s, i) => ({ ...s, order: i }));

      updateSubSteps(reindexed);
      setAddingAtIndex(null);
      setNewStepLabel("");
    },
    [newStepLabel, subSteps, updateSubSteps]
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

  // Drag-to-reorder
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, index: number) => {
      e.dataTransfer.setData("application/edge-step-reorder", String(index));
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, index: number) => {
      if (e.dataTransfer.types.includes("application/edge-step-reorder")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
      }
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
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

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  if (!edge || !sourceNode || !targetNode) return null;

  const sourceName = sourceNode.data?.label || sourceNode.type || "Source";
  const targetName = targetNode.data?.label || targetNode.type || "Target";
  const sortedSteps = [...subSteps].sort((a, b) => a.order - b.order);

  const addButton = (index: number) => (
    <button
      key={`add-${index}`}
      onClick={() => {
        setAddingAtIndex(index);
        setNewStepLabel("");
      }}
      className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full shrink-0",
        "border-2 border-dashed border-slate-300 dark:border-zinc-600",
        "text-slate-400 dark:text-zinc-500",
        "hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-900/20",
        "transition-colors"
      )}
      title="Add step here"
    >
      <Plus className="w-3 h-3" />
    </button>
  );

  const arrow = (
    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0" />
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connection Detail" maxWidth="2xl">
      {/* Connection header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-zinc-700">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-600 text-white text-xs font-bold shrink-0">
          {edge.data?.number || "E"}
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {sourceName}
        </span>
        <ArrowRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {targetName}
        </span>
        {sortedSteps.length > 0 && (
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            {sortedSteps.length} step{sortedSteps.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Flow visualization */}
      <div className="flex items-center gap-2 flex-wrap py-4 min-h-[80px]">
        {/* Source chip */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">{sourceName}</span>
        </div>

        {arrow}
        {addButton(0)}

        {/* Steps */}
        {sortedSteps.map((step, i) => (
          <div key={step.id} className="contents">
            {arrow}

            {/* Step card */}
            <div
              draggable={editingStepId !== step.id}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 rounded-lg group/step shrink-0",
                "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-600",
                "cursor-grab active:cursor-grabbing",
                "hover:shadow-sm transition-shadow",
                dragOverIndex === i && "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
              )}
            >
              <GripVertical className="w-3 h-3 text-slate-300 dark:text-zinc-600 shrink-0 opacity-0 group-hover/step:opacity-100 transition-opacity" />

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
                  className="px-1 py-0.5 text-sm border border-blue-400 rounded bg-white dark:bg-zinc-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30 min-w-[80px]"
                />
              ) : (
                <span
                  onDoubleClick={() => startEditing(step)}
                  className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-default select-none"
                  title="Double-click to edit"
                >
                  {step.label}
                </span>
              )}

              {/* Delete button */}
              <button
                onClick={() => handleRemoveStep(step.id)}
                className="ml-1 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:text-zinc-600 dark:hover:text-red-400 dark:hover:bg-red-900/20 opacity-0 group-hover/step:opacity-100 transition-all"
                title="Remove step"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {arrow}
            {addButton(i + 1)}
          </div>
        ))}

        {arrow}

        {/* Target chip */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-800 dark:text-red-300">{targetName}</span>
        </div>
      </div>

      {/* Inline add input */}
      {addingAtIndex !== null && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700">
          <input
            ref={addInputRef}
            type="text"
            value={newStepLabel}
            onChange={(e) => setNewStepLabel(e.target.value)}
            onBlur={() => handleAddStep(addingAtIndex)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddStep(addingAtIndex);
              if (e.key === "Escape") {
                setAddingAtIndex(null);
                setNewStepLabel("");
              }
            }}
            placeholder="Step name..."
            className={cn(
              "flex-1 px-2.5 py-1.5 text-sm rounded-md border border-slate-200",
              "bg-white dark:bg-zinc-700 dark:border-zinc-600 dark:text-slate-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            )}
          />
          <button
            onClick={() => handleAddStep(addingAtIndex)}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => {
              setAddingAtIndex(null);
              setNewStepLabel("");
            }}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Hint */}
      {sortedSteps.length === 0 && addingAtIndex === null && (
        <p className="text-xs text-slate-400 dark:text-zinc-500 text-center mt-2">
          Click the + button to add intermediate steps between the source and target.
        </p>
      )}
    </Modal>
  );
}
