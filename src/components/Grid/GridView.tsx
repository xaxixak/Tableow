import { useMemo, useState, useCallback, useEffect } from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { cn } from "../../lib/utils.ts";
import type { StageDefinition } from "../../types/grid.ts";
import GridHeader from "./GridHeader.tsx";
import GridLane from "./GridLane.tsx";
import GridConnections from "./GridConnections.tsx";

interface ContextMenuState {
  x: number;
  y: number;
}

export default function GridView() {
  const gridConfig = useWorkflowStore((s) => s.gridConfig);
  const nodes = useWorkflowStore((s) => s.nodes);
  const addLane = useWorkflowStore((s) => s.addLane);
  const addStage = useWorkflowStore((s) => s.addStage);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const seedGrid = useWorkflowStore((s) => s.seedGrid);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const removeEdge = useWorkflowStore((s) => s.removeEdge);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const selectedNodeIds = useWorkflowStore((s) => s.selectedNodeIds);
  const selectedEdgeId = useWorkflowStore((s) => s.selectedEdgeId);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const { lanes, stages, placements } = gridConfig;

  // Compute leaf columns (for CSS grid template)
  const leafStages = useMemo(() => {
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const topLevel = sorted.filter((s) => !s.parentId);
    const childrenByParent = new Map<string, StageDefinition[]>();

    for (const stage of sorted) {
      if (stage.parentId) {
        const list = childrenByParent.get(stage.parentId) ?? [];
        list.push(stage);
        childrenByParent.set(stage.parentId, list);
      }
    }

    const leaves: StageDefinition[] = [];
    for (const stage of topLevel) {
      const children = childrenByParent.get(stage.id);
      if (children && children.length > 0) {
        leaves.push(...children);
      } else {
        leaves.push(stage);
      }
    }
    return leaves;
  }, [stages]);

  // Top-level lanes
  const topLevelLanes = useMemo(
    () =>
      [...lanes]
        .filter((l) => !l.parentId)
        .sort((a, b) => a.order - b.order),
    [lanes]
  );

  // All child lanes (for passing down recursively)
  const childLanes = useMemo(
    () => lanes.filter((l) => l.parentId),
    [lanes]
  );

  const laneColumnWidth = gridConfig.laneColumnWidth;

  // Grid template: lane-label column + one column per leaf stage
  const gridTemplateColumns = useMemo(() => {
    const labelCol = laneColumnWidth ? `${laneColumnWidth}px` : "minmax(120px, auto)";
    const stageCols = leafStages
      .map((s) => {
        const w = s.width;
        return w ? `${w}px` : "minmax(150px, 1fr)";
      })
      .join(" ");
    return `${labelCol} ${stageCols}`;
  }, [leafStages, laneColumnWidth]);

  const handleAddLane = useCallback(() => {
    const name = window.prompt("Lane name:");
    if (name?.trim()) {
      const maxOrder = lanes.reduce((max, l) => Math.max(max, l.order), 0);
      addLane({ label: name.trim(), order: maxOrder + 1 });
    }
  }, [lanes, addLane]);

  const handleAddStage = useCallback(() => {
    const name = window.prompt("Stage name:");
    if (name?.trim()) {
      const maxOrder = stages.reduce((max, s) => Math.max(max, s.order), 0);
      addStage({ label: name.trim(), order: maxOrder + 1 });
    }
  }, [stages, addStage]);

  const handleBackgroundContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Only show on the grid background, not on child elements
      if (e.target === e.currentTarget) {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAddLane = useCallback(() => {
    closeContextMenu();
    handleAddLane();
  }, [closeContextMenu, handleAddLane]);

  const handleContextAddStage = useCallback(() => {
    closeContextMenu();
    handleAddStage();
  }, [closeContextMenu, handleAddStage]);

  // Delete key handler for selected nodes/edges
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (selectedNodeIds.size > 1) {
        e.preventDefault();
        if (window.confirm(`Delete ${selectedNodeIds.size} selected nodes?`)) {
          for (const id of selectedNodeIds) removeNode(id);
        }
      } else if (selectedNodeId) {
        e.preventDefault();
        const node = nodes.find((n) => n.id === selectedNodeId);
        if (window.confirm(`Delete "${node?.data.label ?? "node"}"?`)) {
          removeNode(selectedNodeId);
        }
      } else if (selectedEdgeId) {
        e.preventDefault();
        if (window.confirm("Delete this connection?")) {
          removeEdge(selectedEdgeId);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedNodeId, selectedNodeIds, selectedEdgeId, nodes, removeNode, removeEdge]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeContextMenu();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu, closeContextMenu]);

  // Deselect node when clicking grid background
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        selectNode(null);
      }
    },
    [selectNode]
  );

  const isEmpty = lanes.length === 0 && stages.length === 0;

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-black">
      {/* Grid scroll area */}
      <div
        className="flex-1 overflow-auto relative"
        onClick={handleBackgroundClick}
        onContextMenu={handleBackgroundContextMenu}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <LayoutGrid className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Start your workflow grid</p>
              <p className="text-xs mt-1 dark:text-slate-500">Pick a template or add lanes and stages manually</p>
            </div>

            {/* Seed templates */}
            <div className="flex gap-3">
              <button
                onClick={() => seedGrid(2, 2)}
                className={cn(
                  "flex flex-col items-center gap-2 px-5 py-3 rounded-lg",
                  "border-2 border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-slate-400",
                  "hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50",
                  "dark:hover:border-blue-600 dark:hover:text-blue-400 dark:hover:bg-blue-900/20",
                  "transition-colors"
                )}
              >
                <div className="grid grid-cols-2 gap-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-4 h-3 rounded-sm bg-slate-300 dark:bg-zinc-700" />
                  ))}
                </div>
                <span className="text-xs font-medium">2 x 2</span>
              </button>
              <button
                onClick={() => seedGrid(3, 3)}
                className={cn(
                  "flex flex-col items-center gap-2 px-5 py-3 rounded-lg",
                  "border-2 border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-slate-400",
                  "hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50",
                  "dark:hover:border-blue-600 dark:hover:text-blue-400 dark:hover:bg-blue-900/20",
                  "transition-colors"
                )}
              >
                <div className="grid grid-cols-3 gap-0.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="w-3 h-2.5 rounded-sm bg-slate-300 dark:bg-zinc-700" />
                  ))}
                </div>
                <span className="text-xs font-medium">3 x 3</span>
              </button>
              <button
                onClick={() => seedGrid(4, 4)}
                className={cn(
                  "flex flex-col items-center gap-2 px-5 py-3 rounded-lg",
                  "border-2 border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-slate-400",
                  "hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50",
                  "dark:hover:border-blue-600 dark:hover:text-blue-400 dark:hover:bg-blue-900/20",
                  "transition-colors"
                )}
              >
                <div className="grid grid-cols-4 gap-0.5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2 rounded-sm bg-slate-300 dark:bg-zinc-700" />
                  ))}
                </div>
                <span className="text-xs font-medium">4 x 4</span>
              </button>
            </div>

            {/* Manual add */}
            <div className="flex gap-2">
              <button
                onClick={handleAddLane}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md",
                  "border border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-slate-400",
                  "hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Lane
              </button>
              <button
                onClick={handleAddStage}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md",
                  "border border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-slate-400",
                  "hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Stage
              </button>
            </div>
          </div>
        ) : (
          <div className="relative inline-block min-w-full">
            {/* CSS Grid layout */}
            <div
              className="grid"
              style={{ gridTemplateColumns }}
              role="grid"
              aria-label="Workflow grid view"
            >
              {/* Header rows */}
              <GridHeader stages={stages} />

              {/* Lane rows */}
              {topLevelLanes.map((lane) => (
                <GridLane
                  key={lane.id}
                  lane={lane}
                  childLanes={childLanes}
                  leafStages={leafStages}
                  placements={placements}
                  nodes={nodes}
                />
              ))}
            </div>

            {/* SVG connection overlay */}
            <GridConnections />

            {/* Add buttons (bottom edge) */}
            <div className="flex justify-center gap-2 py-2">
              <button
                onClick={handleAddLane}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 text-xs rounded-md",
                  "border border-dashed border-slate-300 dark:border-zinc-700 text-slate-400 dark:text-slate-500",
                  "hover:border-slate-400 hover:text-slate-500 hover:bg-white",
                  "dark:hover:border-zinc-600 dark:hover:text-slate-400 dark:hover:bg-zinc-900",
                  "transition-colors"
                )}
                title="Add lane"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Lane
              </button>
              <button
                onClick={handleAddStage}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 text-xs rounded-md",
                  "border border-dashed border-slate-300 dark:border-zinc-700 text-slate-400 dark:text-slate-500",
                  "hover:border-slate-400 hover:text-slate-500 hover:bg-white",
                  "dark:hover:border-zinc-600 dark:hover:text-slate-400 dark:hover:bg-zinc-900",
                  "transition-colors"
                )}
                title="Add stage (column)"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Stage
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Background context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleContextAddLane}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lane
          </button>
          <button
            onClick={handleContextAddStage}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stage
          </button>
        </div>
      )}
    </div>
  );
}
