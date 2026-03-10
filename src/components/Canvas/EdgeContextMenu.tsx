import { Expand, Shrink, Trash2 } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";

interface EdgeContextMenuProps {
  x: number;
  y: number;
  edgeId: string;
  onClose: () => void;
}

export function EdgeContextMenu({ x, y, edgeId, onClose }: EdgeContextMenuProps) {
  const edges = useWorkflowStore((s) => s.edges);
  const expandedEdgeIds = useWorkflowStore((s) => s.expandedEdgeIds);
  const toggleEdgeExpand = useWorkflowStore((s) => s.toggleEdgeExpand);
  const removeEdge = useWorkflowStore((s) => s.removeEdge);

  const edge = edges.find((e) => e.id === edgeId);
  const stepCount = edge?.data?.subSteps?.length ?? 0;
  const isExpanded = expandedEdgeIds.has(edgeId);
  const edgeLabel = edge?.data?.number || edge?.data?.label || edgeId;

  const handleToggleExpand = () => {
    toggleEdgeExpand(edgeId);
    onClose();
  };

  const handleDelete = () => {
    removeEdge(edgeId);
    onClose();
  };

  return (
    <div
      className="fixed z-50 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-600 rounded-lg shadow-lg py-1 min-w-[170px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wide border-b border-slate-100 dark:border-zinc-700">
        {edgeLabel}
      </div>

      {/* Expand/Collapse — only if edge has sub-steps */}
      {stepCount > 0 && (
        <button
          onClick={handleToggleExpand}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
        >
          {isExpanded ? (
            <>
              <Shrink className="w-3.5 h-3.5" />
              Collapse Steps
            </>
          ) : (
            <>
              <Expand className="w-3.5 h-3.5" />
              Expand Steps ({stepCount})
            </>
          )}
        </button>
      )}

      {/* Separator */}
      <div className="border-t border-slate-100 dark:border-zinc-700 my-0.5" />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete Connection
      </button>
    </div>
  );
}
