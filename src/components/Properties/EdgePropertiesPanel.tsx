import { useMemo, useCallback, useState } from "react";
import { Trash2, X, ListOrdered } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import { EdgeDetailModal } from "../Modal/EdgeDetailModal";

export function EdgePropertiesPanel() {
  const selectedEdgeId = useWorkflowStore((s) => s.selectedEdgeId);
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const removeEdge = useWorkflowStore((s) => s.removeEdge);
  const selectEdge = useWorkflowStore((s) => s.selectEdge);
  const updateEdge = useWorkflowStore((s) => s.updateEdge);

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId),
    [edges, selectedEdgeId]
  );

  const [label, setLabel] = useState(selectedEdge?.data?.label || "");
  const [description, setDescription] = useState(selectedEdge?.data?.description || "");
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Update local state when selected edge changes
  useMemo(() => {
    setLabel(selectedEdge?.data?.label || "");
    setDescription(selectedEdge?.data?.description || "");
  }, [selectedEdge]);

  const sourceNode = useMemo(
    () => nodes.find((n) => n.id === selectedEdge?.source),
    [nodes, selectedEdge]
  );

  const targetNode = useMemo(
    () => nodes.find((n) => n.id === selectedEdge?.target),
    [nodes, selectedEdge]
  );

  const handleLabelChange = useCallback(
    (value: string) => {
      setLabel(value);
      if (selectedEdgeId) {
        updateEdge(selectedEdgeId, { label: value });
      }
    },
    [selectedEdgeId, updateEdge]
  );

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value);
      if (selectedEdgeId) {
        updateEdge(selectedEdgeId, { description: value });
      }
    },
    [selectedEdgeId, updateEdge]
  );

  const handleDelete = useCallback(() => {
    if (!selectedEdgeId) return;
    if (window.confirm("Delete this connection?")) {
      removeEdge(selectedEdgeId);
    }
  }, [selectedEdgeId, removeEdge]);

  const handleClose = useCallback(() => {
    selectEdge(null);
  }, [selectEdge]);

  if (!selectedEdge) return null;

  const inputClasses = cn(
    "w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200",
    "bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-600 text-white text-sm font-medium">
            {selectedEdge.data?.number || "E"}
          </div>
          <div>
            <h2 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
              {selectedEdge.data?.label || selectedEdge.data?.number || "Connection"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Connection Properties</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded transition-colors"
          title="Close properties"
        >
          <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Connection Info */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-700">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Connection
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">From:</span>{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {sourceNode?.data?.label || sourceNode?.type || "Unknown"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">To:</span>{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {targetNode?.data?.label || targetNode?.type || "Unknown"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">ID:</span>{" "}
              <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                {selectedEdge.data?.number || selectedEdge.id}
              </span>
            </div>
          </div>
        </div>

        {/* Edge Properties */}
        <div className="px-4 py-3 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Properties
          </h3>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Enter connection label..."
              className={inputClasses}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Enter connection description..."
              rows={4}
              className={inputClasses}
            />
          </div>
        </div>

        {/* Sub-Steps / Detail */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-zinc-700">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Detail Steps
          </h3>
          {(selectedEdge.data?.subSteps?.length ?? 0) > 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
              {selectedEdge.data!.subSteps!.length} intermediate step{selectedEdge.data!.subSteps!.length !== 1 ? "s" : ""} defined
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">
              No intermediate steps — direct connection
            </p>
          )}
          <button
            onClick={() => setDetailModalOpen(true)}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-md",
              "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200",
              "dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700 dark:border-zinc-600",
              "transition-colors"
            )}
          >
            <ListOrdered className="w-4 h-4" />
            Edit Detail
          </button>
        </div>
      </div>

      {/* Footer - Delete Button */}
      <div className="p-4 border-t border-slate-200 dark:border-zinc-700">
        <button
          onClick={handleDelete}
          className={cn(
            "flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-md",
            "bg-red-50 text-red-600 hover:bg-red-100",
            "dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
            "transition-colors"
          )}
        >
          <Trash2 className="w-4 h-4" />
          Delete Connection
        </button>
      </div>

      {/* Edge Detail Modal */}
      {selectedEdgeId && (
        <EdgeDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          edgeId={selectedEdgeId}
        />
      )}
    </div>
  );
}
