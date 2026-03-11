import { useMemo, useCallback } from "react";
import { ArrowRight, ExternalLink, Link2 } from "lucide-react";
import { Modal } from "./Modal";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";

interface LinkOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LinkOverviewModal({ isOpen, onClose }: LinkOverviewModalProps) {
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const selectEdge = useWorkflowStore((s) => s.selectEdge);
  const openEdgeDetailModal = useWorkflowStore((s) => s.openEdgeDetailModal);

  const nodeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      map.set(node.id, node.data?.label || node.type || "Unknown");
    }
    return map;
  }, [nodes]);

  const edgeRows = useMemo(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        number: edge.data?.number || "—",
        source: nodeMap.get(edge.source) || "Unknown",
        target: nodeMap.get(edge.target) || "Unknown",
        label: edge.data?.label || "",
        stepCount: edge.data?.subSteps?.length ?? 0,
      })),
    [edges, nodeMap]
  );

  const handleOpenDetail = useCallback((edgeId: string) => {
    openEdgeDetailModal(edgeId);
  }, [openEdgeDetailModal]);

  const handleSelectEdge = useCallback(
    (edgeId: string) => {
      selectEdge(edgeId);
      onClose();
    },
    [selectEdge, onClose]
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Link Overview" maxWidth="2xl">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-zinc-700">
          <Link2 className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {edgeRows.length} connection{edgeRows.length !== 1 ? "s" : ""}
          </span>
        </div>

        {edgeRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-zinc-500">
            <Link2 className="w-8 h-8 mb-2" />
            <p className="text-sm">No connections yet</p>
            <p className="text-xs mt-1">Connect nodes in the canvas or grid to create links</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-700 text-left">
                  <th className="px-2 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-2 py-2 w-6" />
                  <th className="px-2 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    To
                  </th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-center w-16">
                    Steps
                  </th>
                  <th className="px-2 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right w-28">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {edgeRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center justify-center w-7 h-5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-mono font-medium">
                        {row.number}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                      {row.source}
                    </td>
                    <td className="px-1 py-2">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                      {row.target}
                    </td>
                    <td className="px-2 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      {row.label || <span className="text-slate-300 dark:text-zinc-600">—</span>}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {row.stepCount > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                          {row.stepCount}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetail(row.id)}
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded",
                            "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20",
                            "transition-colors"
                          )}
                          title="Edit sub-steps"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => handleSelectEdge(row.id)}
                          className={cn(
                            "p-1 rounded",
                            "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
                            "dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-700",
                            "transition-colors"
                          )}
                          title="Select in canvas"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

    </>
  );
}
