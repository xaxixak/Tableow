import { useState, useCallback, useMemo, useRef, useEffect, type DragEvent } from "react";
import { Plus, X, GripVertical, ArrowRight, Search, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { nodeRegistry } from "../../registry/index.ts";
import { cn } from "../../lib/utils.ts";
import type { EdgeSubStep, NodeDefinition } from "../../types/index.ts";

const BUILTIN_CATEGORIES = new Set([
  "General",
  "Accounting",
  "Procurement",
  "Sales",
  "Inventory",
  "HR",
  "Finance",
]);

interface CategoryGroup {
  name: string;
  fullPath: string;
  definitions: NodeDefinition[];
  children: Map<string, CategoryGroup>;
}

function buildCategoryGroups(definitions: NodeDefinition[]): CategoryGroup {
  const root: CategoryGroup = { name: "", fullPath: "", definitions: [], children: new Map() };
  for (const def of definitions) {
    const parts = def.category.split("/").map((p) => p.trim()).filter(Boolean);
    let current = root;
    let pathSoFar = "";
    for (const part of parts) {
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
      if (!current.children.has(part)) {
        current.children.set(part, { name: part, fullPath: pathSoFar, definitions: [], children: new Map() });
      }
      current = current.children.get(part)!;
    }
    current.definitions.push(def);
  }
  return root;
}

function countDefsRecursive(group: CategoryGroup): number {
  let count = group.definitions.length;
  for (const child of group.children.values()) count += countDefsRecursive(child);
  return count;
}

interface ExpandedEdgeFlowProps {
  edgeId: string;
  onClose?: () => void;
}

export function ExpandedEdgeFlow({ edgeId, onClose }: ExpandedEdgeFlowProps) {
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateEdge = useWorkflowStore((s) => s.updateEdge);
  const customCategories = useWorkflowStore((s) => s.customCategories);
  const registryVersion = useWorkflowStore((s) => s.registryVersion);

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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [myNodesOpen, setMyNodesOpen] = useState(true);
  const editInputRef = useRef<HTMLInputElement>(null);

  const customNodeTypes = useWorkflowStore((s) => s.customNodeTypes);

  const customTypeSet = useMemo(
    () => new Set(customNodeTypes.map((d) => d.type)),
    [customNodeTypes]
  );

  // All node definitions split into built-in and custom
  const { builtInTree, customTree } = useMemo(() => {
    const all = nodeRegistry.getAll();
    const filtered = searchQuery.trim()
      ? all.filter((d) => {
          const q = searchQuery.toLowerCase();
          return d.label.toLowerCase().includes(q) ||
            d.category.toLowerCase().includes(q) ||
            d.type.toLowerCase().includes(q);
        })
      : all;

    const builtInNodes = filtered.filter((d) => {
      const topCategory = d.category.split("/")[0];
      return BUILTIN_CATEGORIES.has(topCategory) && !customTypeSet.has(d.type);
    });
    const customNodes = filtered.filter((d) => {
      const topCategory = d.category.split("/")[0];
      return !BUILTIN_CATEGORIES.has(topCategory) || customTypeSet.has(d.type);
    });

    return {
      builtInTree: buildCategoryGroups(builtInNodes),
      customTree: buildCategoryGroups(customNodes),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, registryVersion, customTypeSet]);

  const categoryNumberMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of customCategories) map.set(cat.path, cat.number);
    return map;
  }, [customCategories]);

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

  // ── Click to add node as sub-step (canvas mode — drag doesn't work in EdgeLabelRenderer) ──
  const handleNodeClick = useCallback(
    (label: string) => {
      handleAddNodeStep(subSteps.length, "", label);
    },
    [handleAddNodeStep, subSteps.length]
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

            {/* Two-section node list */}
            <div className="max-h-[180px] overflow-y-auto rounded-md border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800/50">
              {builtInTree.children.size === 0 && customTree.children.size === 0 ? (
                <div className="px-2 py-3 text-center text-[10px] text-slate-400 dark:text-zinc-500">
                  No matching nodes
                </div>
              ) : (
                <>
                  {/* Node Library (Built-in) */}
                  {builtInTree.children.size > 0 && (
                    <div className="border-b border-slate-200 dark:border-zinc-700">
                      <button
                        onClick={() => setLibraryOpen(!libraryOpen)}
                        className="flex items-center gap-1 w-full px-2 py-1 text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                      >
                        {libraryOpen ? (
                          <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                        ) : (
                          <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                        )}
                        <span>Node Library</span>
                        <span className="ml-auto text-slate-400 dark:text-slate-500 font-normal normal-case text-[9px]">
                          {builtInTree.children.size} cat
                        </span>
                      </button>
                      {libraryOpen && (
                        <div>
                          {Array.from(builtInTree.children.values()).map((group) => (
                            <CompactCategory
                              key={group.fullPath}
                              group={group}
                              depth={0}
                              defaultOpen={searchQuery.trim().length > 0}
                              categoryNumberMap={categoryNumberMap}
                              onNodeClick={handleNodeClick}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* My Nodes (Custom) */}
                  <div>
                    <button
                      onClick={() => setMyNodesOpen(!myNodesOpen)}
                      className="flex items-center gap-1 w-full px-2 py-1 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 uppercase tracking-wider"
                    >
                      {myNodesOpen ? (
                        <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                      ) : (
                        <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                      )}
                      <span>My Nodes</span>
                      <span className="ml-auto text-blue-600 dark:text-blue-400 font-normal normal-case text-[9px]">
                        {customTree.children.size} cat
                      </span>
                    </button>
                    {myNodesOpen && (
                      <div>
                        {customTree.children.size === 0 ? (
                          <div className="px-2 py-3 text-center text-[10px] text-slate-400 dark:text-zinc-500">
                            No custom nodes yet
                          </div>
                        ) : (
                          Array.from(customTree.children.values()).map((group) => (
                            <CompactCategory
                              key={group.fullPath}
                              group={group}
                              depth={0}
                              defaultOpen={searchQuery.trim().length > 0}
                              categoryNumberMap={categoryNumberMap}
                              onNodeClick={handleNodeClick}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compact collapsible category for inline panel ──

const COMPACT_COLORS = [
  "bg-sky-50 dark:bg-sky-900/30",
  "bg-emerald-50 dark:bg-emerald-900/30",
  "bg-amber-50 dark:bg-amber-900/30",
  "bg-violet-50 dark:bg-violet-900/30",
];

function CompactCategory({
  group,
  depth,
  defaultOpen,
  categoryNumberMap,
  onNodeClick,
}: {
  group: CategoryGroup;
  depth: number;
  defaultOpen: boolean;
  categoryNumberMap: Map<string, string>;
  onNodeClick?: (label: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const total = countDefsRecursive(group);
  const catNumber = categoryNumberMap.get(group.fullPath);
  const bgColor = COMPACT_COLORS[depth % COMPACT_COLORS.length];

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 w-full px-1.5 py-1 text-[10px] font-semibold",
          "text-slate-700 dark:text-slate-200 uppercase tracking-wider",
          "hover:brightness-95 dark:hover:brightness-110 transition-all",
          bgColor
        )}
        style={{ paddingLeft: `${4 + depth * 12}px` }}
      >
        {open ? (
          <ChevronDown className="w-2.5 h-2.5 shrink-0" />
        ) : (
          <ChevronRight className="w-2.5 h-2.5 shrink-0" />
        )}
        {catNumber && (
          <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400">
            {catNumber}:
          </span>
        )}
        <span className="truncate">{group.name}</span>
        <span className="ml-auto text-slate-400 dark:text-zinc-500 font-normal normal-case text-[9px]">
          {total}
        </span>
      </button>

      {open && (
        <>
          {group.definitions.map((def) => (
            <div
              key={def.type}
              onClick={() => onNodeClick?.(def.label)}
              className={cn(
                "flex items-center gap-1.5 w-full px-2 py-1 text-left text-[11px]",
                "hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors",
                "cursor-pointer select-none active:bg-amber-100 dark:active:bg-amber-900/30"
              )}
              style={{ paddingLeft: `${12 + depth * 12}px` }}
              title={`Click to add "${def.label}" as sub-step`}
            >
              <Plus className="w-2.5 h-2.5 text-amber-500 shrink-0" />
              {def.icon && (
                <span className="text-[11px] leading-none shrink-0">{def.icon}</span>
              )}
              <span className="text-slate-700 dark:text-slate-200 truncate">
                {def.number && (
                  <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 mr-0.5">
                    {def.number}:
                  </span>
                )}
                {def.label}
              </span>
            </div>
          ))}

          {Array.from(group.children.values()).map((child) => (
            <CompactCategory
              key={child.fullPath}
              group={child}
              depth={depth + 1}
              defaultOpen={defaultOpen}
              categoryNumberMap={categoryNumberMap}
              onNodeClick={onNodeClick}
            />
          ))}
        </>
      )}
    </div>
  );
}
