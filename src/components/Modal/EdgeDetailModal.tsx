import { useState, useCallback, useMemo, useRef, useEffect, type DragEvent } from "react";
import { Plus, X, GripVertical, ArrowRight, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Modal } from "./Modal";
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

interface EdgeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  edgeId: string;
}

export function EdgeDetailModal({ isOpen, onClose, edgeId }: EdgeDetailModalProps) {
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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [myNodesOpen, setMyNodesOpen] = useState(true);
  const editInputRef = useRef<HTMLInputElement>(null);

  const customNodeTypes = useWorkflowStore((s) => s.customNodeTypes);

  const customTypeSet = useMemo(
    () => new Set(customNodeTypes.map((d) => d.type)),
    [customNodeTypes]
  );

  // All node definitions from the registry, split into built-in and custom
  const { builtInTree, customTree, totalCount } = useMemo(() => {
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
      totalCount: filtered.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, registryVersion, customTypeSet]);

  // Category number lookup
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

  // ── Drag node definition from palette into flow ──
  const handleNodeDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, label: string) => {
      e.dataTransfer.setData("application/edge-node-add", JSON.stringify({ nodeId: "", label }));
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

  // + drop zone button — accepts node drops and click-to-add
  const dropZone = (index: number) => (
    <button
      key={`drop-${index}`}
      onDragOver={(e) => handleDropZoneDragOver(e, index)}
      onDragLeave={handleDropZoneDragLeave}
      onDrop={(e) => handleDropZoneDrop(e, index)}
      onDragEnd={handleDropZoneDragEnd}
      className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-all",
        nodeDropIndex === index
          ? "w-8 h-8 border-2 border-solid border-blue-500 bg-blue-100 dark:bg-blue-900/40 text-blue-600 scale-110"
          : "border-2 border-dashed border-slate-300 dark:border-zinc-600 text-slate-400 dark:text-zinc-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
      )}
      title="Drop a node here or click to browse"
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

      {/* Flow visualization — drop zones between nodes */}
      <div className="flex items-center gap-2 flex-wrap py-4 min-h-[80px]">
        {/* Source chip */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">{sourceName}</span>
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
            {dropZone(i + 1)}
          </div>
        ))}

        {arrow}

        {/* Target chip */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-800 dark:text-red-300">{targetName}</span>
        </div>
      </div>

      {/* ── Available Nodes palette (split: Node Library + My Nodes) ── */}
      <div className="mt-2 pt-3 border-t border-slate-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Available Nodes — drag into flow
          </span>
          <span className="text-xs text-slate-400 dark:text-zinc-500">
            {totalCount} node{totalCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className={cn(
              "w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200",
              "bg-white dark:bg-zinc-700 dark:border-zinc-600 dark:text-slate-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            )}
          />
        </div>

        {/* Two-section node list */}
        <div className="max-h-[260px] overflow-y-auto rounded-md border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800/50">
          {builtInTree.children.size === 0 && customTree.children.size === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-zinc-500">
              No matching nodes
            </div>
          ) : (
            <>
              {/* Node Library (Built-in) */}
              {builtInTree.children.size > 0 && (
                <div className="border-b border-slate-200 dark:border-zinc-700">
                  <button
                    onClick={() => setLibraryOpen(!libraryOpen)}
                    className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                  >
                    {libraryOpen ? (
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 shrink-0" />
                    )}
                    <span>Node Library</span>
                    <span className="ml-auto text-slate-400 dark:text-slate-500 font-normal normal-case text-[10px]">
                      {builtInTree.children.size} categories
                    </span>
                  </button>
                  {libraryOpen && (
                    <div>
                      {Array.from(builtInTree.children.values()).map((group) => (
                        <EdgeNodeCategory
                          key={group.fullPath}
                          group={group}
                          depth={0}
                          defaultOpen={searchQuery.trim().length > 0}
                          categoryNumberMap={categoryNumberMap}
                          onDragStart={handleNodeDragStart}
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
                  className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 uppercase tracking-wider"
                >
                  {myNodesOpen ? (
                    <ChevronDown className="w-3 h-3 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 shrink-0" />
                  )}
                  <span>My Nodes</span>
                  <span className="ml-auto text-blue-600 dark:text-blue-400 font-normal normal-case text-[10px]">
                    {customTree.children.size} categories
                  </span>
                </button>
                {myNodesOpen && (
                  <div>
                    {customTree.children.size === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-zinc-500">
                        No custom nodes yet
                      </div>
                    ) : (
                      Array.from(customTree.children.values()).map((group) => (
                        <EdgeNodeCategory
                          key={group.fullPath}
                          group={group}
                          depth={0}
                          defaultOpen={searchQuery.trim().length > 0}
                          categoryNumberMap={categoryNumberMap}
                          onDragStart={handleNodeDragStart}
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

      {/* Hint */}
      {sortedSteps.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-zinc-500 text-center mt-2">
          Drag nodes from the list above onto the + drop zones, or double-click steps to rename.
        </p>
      )}
    </Modal>
  );
}

// ── Collapsible category section for the node picker ──

const DEPTH_COLORS = [
  "bg-sky-50 dark:bg-sky-900/30",
  "bg-emerald-50 dark:bg-emerald-900/30",
  "bg-amber-50 dark:bg-amber-900/30",
  "bg-violet-50 dark:bg-violet-900/30",
];

function EdgeNodeCategory({
  group,
  depth,
  defaultOpen,
  categoryNumberMap,
  onDragStart,
}: {
  group: CategoryGroup;
  depth: number;
  defaultOpen: boolean;
  categoryNumberMap: Map<string, string>;
  onDragStart: (e: DragEvent<HTMLDivElement>, label: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen || depth === 0);

  // Auto-open when searching
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const total = countDefsRecursive(group);
  const catNumber = categoryNumberMap.get(group.fullPath);
  const bgColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold",
          "text-slate-700 dark:text-slate-200 uppercase tracking-wider",
          "hover:brightness-95 dark:hover:brightness-110 transition-all",
          bgColor
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {open ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
        {catNumber && (
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
            {catNumber}:
          </span>
        )}
        <span className="truncate">{group.name}</span>
        <span className="ml-auto text-slate-400 dark:text-zinc-500 font-normal normal-case text-[10px]">
          {total}
        </span>
      </button>

      {open && (
        <>
          {/* Node definitions at this level */}
          {group.definitions.map((def) => (
            <div
              key={def.type}
              draggable
              onDragStart={(e) => onDragStart(e, def.label)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm",
                "hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors",
                "cursor-grab active:cursor-grabbing select-none"
              )}
              style={{ paddingLeft: `${20 + depth * 16}px` }}
            >
              {def.icon && (
                <span className="text-sm leading-none shrink-0">{def.icon}</span>
              )}
              <span className="text-slate-700 dark:text-slate-200 truncate text-xs">
                {def.number && (
                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mr-1">
                    {def.number}:
                  </span>
                )}
                {def.label}
              </span>
            </div>
          ))}

          {/* Nested subcategories */}
          {Array.from(group.children.values()).map((child) => (
            <EdgeNodeCategory
              key={child.fullPath}
              group={child}
              depth={depth + 1}
              defaultOpen={defaultOpen}
              categoryNumberMap={categoryNumberMap}
              onDragStart={onDragStart}
            />
          ))}
        </>
      )}
    </div>
  );
}
