import { useState, useMemo, useCallback, useEffect, type DragEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  X,
  Trash2,
  Pencil,
  MoreVertical,
  LayoutGrid,
} from "lucide-react";
import { nodeRegistry } from "../../registry/index.ts";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import type { NodeDefinition } from "../../types/index.ts";
import { cn } from "../../lib/utils.ts";
import { InputModal } from "../Modal/InputModal";
import { ConfirmModal } from "../Modal/ConfirmModal";

// --- Constants ---

const BASE_TYPES = [
  { value: "process", label: "Process" },
  { value: "decision", label: "Decision" },
  { value: "start", label: "Start" },
  { value: "output", label: "Output" },
  { value: "document", label: "Document" },
] as const;

const ICON_PRESETS = [
  "\u{1F4C4}", "\u{1F4CB}", "\u{1F4E6}", "\u{1F4B0}", "\u{1F4B3}",
  "\u{1F4CA}", "\u{2705}", "\u{1F50D}", "\u{2699}\uFE0F", "\u{1F4DD}",
  "\u{1F4E8}", "\u{1F512}", "\u{1F4C1}", "\u{1F4C5}", "\u{1F465}",
];

// Built-in categories that can't be renamed/deleted
const BUILTIN_CATEGORIES = new Set([
  "General",
  "Accounting",
  "Procurement",
  "Sales",
  "Inventory",
  "HR",
  "Finance",
]);

// --- Category Tree Structure ---

interface CategoryNode {
  name: string;
  fullPath: string;
  children: Map<string, CategoryNode>;
  definitions: NodeDefinition[];
}

function buildCategoryTree(
  definitions: NodeDefinition[],
  customCategories: import("../../types/index.ts").CategoryDefinition[]
): CategoryNode {
  const root: CategoryNode = {
    name: "",
    fullPath: "",
    children: new Map(),
    definitions: [],
  };

  // Add all definitions
  for (const def of definitions) {
    const parts = def.category.split("/").map((p) => p.trim()).filter(Boolean);
    let current = root;
    let pathSoFar = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: pathSoFar,
          children: new Map(),
          definitions: [],
        });
      }
      current = current.children.get(part)!;
    }

    // Add definition to the leaf node
    current.definitions.push(def);
  }

  // Ensure empty custom categories appear
  for (const cat of customCategories) {
    const parts = cat.path.split("/").map((p) => p.trim()).filter(Boolean);
    let current = root;
    let pathSoFar = "";

    for (const part of parts) {
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: pathSoFar,
          children: new Map(),
          definitions: [],
        });
      }
      current = current.children.get(part)!;
    }
  }

  return root;
}

// --- Palette Item (draggable node) ---

function NodePaletteItem({
  definition,
  isCustom,
  onEdit,
  onDelete,
}: {
  definition: NodeDefinition;
  isCustom?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/reactflow-type", definition.type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        "flex items-start gap-2.5 px-3 py-2 rounded-md cursor-grab group",
        "border border-transparent hover:border-slate-200 hover:bg-slate-50",
        "dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50",
        "active:cursor-grabbing transition-colors duration-100"
      )}
      title={`Drag to add ${definition.label}`}
    >
      {definition.icon && (
        <span className="text-base leading-none mt-0.5 shrink-0">
          {definition.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
            {definition.number && (
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mr-1.5">
                {definition.number}:
              </span>
            )}
            {definition.label}
          </div>
          {!isCustom && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shrink-0">
              Template
            </span>
          )}
        </div>
        {definition.description && (
          <div className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
            {definition.description}
          </div>
        )}
        {isCustom && definition.sourceTemplateType && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            Based on: {definition.sourceTemplateType}
          </div>
        )}
      </div>
      {isCustom && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
              className="p-0.5 text-slate-400 hover:text-blue-500"
              title="Edit node type"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
              className="p-0.5 text-slate-400 hover:text-red-500"
              title="Delete node type"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Inline Add Node Form (inside a category) ---

function AddNodeForm({
  categoryPath,
  onClose,
}: {
  categoryPath: string;
  onClose: () => void;
}) {
  const addCustomNodeType = useWorkflowStore((s) => s.addCustomNodeType);
  const [label, setLabel] = useState("");
  const [baseType, setBaseType] = useState("process");
  const [icon, setIcon] = useState(ICON_PRESETS[0]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!label.trim()) return;
      addCustomNodeType({
        label: label.trim(),
        category: categoryPath,
        icon,
        baseType: baseType as "process" | "decision" | "start" | "output",
      });
      onClose();
    },
    [label, categoryPath, icon, baseType, addCustomNodeType, onClose]
  );

  const inputCls = cn(
    "w-full px-2 py-1 text-xs rounded border border-slate-200",
    "bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-400"
  );

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2 bg-blue-50/50 border-y border-blue-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-600">Add Node</span>
        <button type="button" onClick={onClose} className="p-0.5 text-slate-400 hover:text-slate-600">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Node name"
          className={inputCls}
          autoFocus
          required
        />
        <div className="flex gap-1.5">
          <select value={baseType} onChange={(e) => setBaseType(e.target.value)} className={inputCls}>
            {BASE_TYPES.map((bt) => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
          </select>
          <div className="flex gap-0.5 shrink-0">
            {ICON_PRESETS.slice(0, 5).map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded text-xs border",
                  icon === ic ? "border-blue-400 bg-blue-50" : "border-slate-200"
                )}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={!label.trim()}
          className={cn(
            "w-full py-1 text-xs font-medium rounded transition-colors",
            "bg-blue-600 text-white hover:bg-blue-700",
            "disabled:bg-slate-300 disabled:cursor-not-allowed"
          )}
        >
          Add
        </button>
      </div>
    </form>
  );
}

// --- Inline Edit Node Form ---

function EditNodeForm({
  definition,
  onClose,
}: {
  definition: NodeDefinition;
  onClose: () => void;
}) {
  const updateCustomNodeType = useWorkflowStore((s) => s.updateCustomNodeType);
  const [label, setLabel] = useState(definition.label);
  const [description, setDescription] = useState(definition.description ?? "");
  const [icon, setIcon] = useState(definition.icon ?? ICON_PRESETS[0]);
  const currentBase = definition.inputs.length === 0 ? "start"
    : definition.outputs.length === 0 ? "output"
    : definition.outputs.length >= 2 ? "decision"
    : "process";
  const [baseType, setBaseType] = useState(currentBase);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!label.trim()) return;
      updateCustomNodeType(definition.type, {
        label: label.trim(),
        description: description.trim() || undefined,
        icon,
        baseType: baseType as "process" | "decision" | "start" | "output",
      });
      onClose();
    },
    [label, description, icon, baseType, definition.type, updateCustomNodeType, onClose]
  );

  const inputCls = cn(
    "w-full px-2 py-1 text-xs rounded border border-slate-200",
    "bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-400"
  );

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2 bg-amber-50/50 border-y border-amber-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-600">Edit Node</span>
        <button type="button" onClick={onClose} className="p-0.5 text-slate-400 hover:text-slate-600">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="Node name" className={inputCls} autoFocus required />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description" className={inputCls} />
        <div className="flex gap-1.5">
          <select value={baseType} onChange={(e) => setBaseType(e.target.value)} className={inputCls}>
            {BASE_TYPES.map((bt) => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
          </select>
          <div className="flex gap-0.5 shrink-0">
            {ICON_PRESETS.slice(0, 5).map((ic) => (
              <button key={ic} type="button" onClick={() => setIcon(ic)}
                className={cn("w-6 h-6 flex items-center justify-center rounded text-xs border",
                  icon === ic ? "border-blue-400 bg-blue-50" : "border-slate-200")}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={!label.trim()}
          className={cn("w-full py-1 text-xs font-medium rounded transition-colors",
            "bg-blue-600 text-white hover:bg-blue-700",
            "disabled:bg-slate-300 disabled:cursor-not-allowed")}>
          Save
        </button>
      </div>
    </form>
  );
}

// --- Category Section (recursive for nested categories) ---

function CategorySection({
  node,
  depth,
  defaultOpen,
  isCustomCategory,
  customTypes,
  onDeleteCustomNode,
}: {
  node: CategoryNode;
  depth: number;
  defaultOpen: boolean;
  isCustomCategory: boolean;
  customTypes: Set<string>;
  onDeleteCustomNode: (type: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [addingNode, setAddingNode] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addSubModalOpen, setAddSubModalOpen] = useState(false);
  const removeCustomCategory = useWorkflowStore((s) => s.removeCustomCategory);
  const renameCustomCategory = useWorkflowStore((s) => s.renameCustomCategory);
  const addCustomCategory = useWorkflowStore((s) => s.addCustomCategory);
  const customCategories = useWorkflowStore((s) => s.customCategories);

  // Find category number for this category
  const categoryDef = customCategories.find((c) => c.path === node.fullPath);
  const categoryNumber = categoryDef?.number;

  const hasChildren = node.children.size > 0;
  const hasDefinitions = node.definitions.length > 0;

  const handleRenameCategory = useCallback(() => {
    setRenameModalOpen(true);
  }, []);

  const handleRenameSubmit = useCallback(
    (newName: string) => {
      if (newName.trim() !== node.fullPath) {
        renameCustomCategory(node.fullPath, newName.trim());
      }
    },
    [node.fullPath, renameCustomCategory]
  );

  const handleDeleteCategory = useCallback(() => {
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    removeCustomCategory(node.fullPath);
  }, [node.fullPath, removeCustomCategory]);

  const handleAddSubCategory = useCallback(() => {
    setAddSubModalOpen(true);
    setShowMenu(false);
  }, []);

  const handleAddSubSubmit = useCallback(
    (name: string) => {
      const newPath = `${node.fullPath}/${name.trim()}`;
      addCustomCategory(newPath);
      setOpen(true);
    },
    [node.fullPath, addCustomCategory]
  );

  const paddingLeft = depth * 12;

  // Hierarchy colors based on depth - more distinct solid colors
  const bgColors = [
    "bg-slate-200 dark:bg-zinc-800",
    "bg-blue-300 dark:bg-blue-800",
    "bg-indigo-300 dark:bg-indigo-800",
    "bg-purple-300 dark:bg-purple-800",
  ];
  const hoverBgColors = [
    "hover:bg-slate-300 dark:hover:bg-zinc-700",
    "hover:bg-blue-400 dark:hover:bg-blue-700",
    "hover:bg-indigo-400 dark:hover:bg-indigo-700",
    "hover:bg-purple-400 dark:hover:bg-purple-700",
  ];
  const headerBg = bgColors[depth % bgColors.length];
  const headerHover = hoverBgColors[depth % hoverBgColors.length];

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = () => setShowMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showMenu]);

  return (
    <div>
      {/* Category header */}
      <div className={cn("flex items-center group", headerBg)}>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-1.5 flex-1 py-2 text-xs font-semibold",
            "text-slate-600 dark:text-slate-200 uppercase tracking-wider",
            "hover:text-slate-900 dark:hover:text-white",
            "transition-colors duration-100",
            headerHover
          )}
          style={{ paddingLeft: `${paddingLeft + 12}px` }}
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            {categoryNumber && (
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mr-1.5">
                {categoryNumber}:
              </span>
            )}
            {node.name}
          </span>
          <span className="ml-auto text-slate-400 font-normal normal-case mr-2">
            {hasDefinitions && node.definitions.length}
          </span>
        </button>
        {/* Category action menu (three dots) */}
        <div className="relative pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            title="Category options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setOpen(true); setAddingNode(true); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3 h-3" />
                Add node
              </button>
              <button
                onClick={handleAddSubCategory}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3 h-3" />
                Add sub-category
              </button>
              {isCustomCategory && (
                <>
                  <hr className="my-1 border-slate-100" />
                  <button
                    onClick={() => { handleRenameCategory(); setShowMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="w-3 h-3" />
                    Rename
                  </button>
                  <button
                    onClick={() => { handleDeleteCategory(); setShowMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category content */}
      {open && (
        <>
          {/* Nodes at this level */}
          {hasDefinitions && (
            <div className="flex flex-col gap-0.5 pb-1" style={{ paddingLeft: `${paddingLeft}px` }}>
              {node.definitions.map((def) => (
                editingNode === def.type ? (
                  <EditNodeForm
                    key={def.type}
                    definition={def}
                    onClose={() => setEditingNode(null)}
                  />
                ) : (
                  <NodePaletteItem
                    key={def.type}
                    definition={def}
                    isCustom={customTypes.has(def.type)}
                    onEdit={() => setEditingNode(def.type)}
                    onDelete={() => onDeleteCustomNode(def.type)}
                  />
                )
              ))}
            </div>
          )}

          {/* Add node form */}
          {addingNode && (
            <div style={{ paddingLeft: `${paddingLeft}px` }}>
              <AddNodeForm categoryPath={node.fullPath} onClose={() => setAddingNode(false)} />
            </div>
          )}

          {/* Nested subcategories */}
          {hasChildren &&
            Array.from(node.children.values()).map((child) => (
              <CategorySection
                key={child.fullPath}
                node={child}
                depth={depth + 1}
                defaultOpen={defaultOpen}
                isCustomCategory={isCustomCategory || !BUILTIN_CATEGORIES.has(child.fullPath)}
                customTypes={customTypes}
                onDeleteCustomNode={onDeleteCustomNode}
              />
            ))}
        </>
      )}

      {/* Modals */}
      <InputModal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        onSubmit={handleRenameSubmit}
        title="Rename Category"
        placeholder="Category name"
        defaultValue={node.fullPath}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Delete category "${node.fullPath}" and all its custom nodes?`}
        confirmText="Delete"
        variant="danger"
      />

      <InputModal
        isOpen={addSubModalOpen}
        onClose={() => setAddSubModalOpen(false)}
        onSubmit={handleAddSubSubmit}
        title="Add Sub-Category"
        placeholder="Sub-category name"
      />
    </div>
  );
}

// --- Main NodePalette ---

export default function NodePalette() {
  const [search, setSearch] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false); // Node Library collapsed by default
  const [myNodesOpen, setMyNodesOpen] = useState(true); // My Nodes expanded by default
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [deleteNodeModalOpen, setDeleteNodeModalOpen] = useState(false);
  const [nodeTypeToDelete, setNodeTypeToDelete] = useState<string>("");
  const registryVersion = useWorkflowStore((s) => s.registryVersion);
  const customNodeTypes = useWorkflowStore((s) => s.customNodeTypes);
  const customCategories = useWorkflowStore((s) => s.customCategories);
  const removeCustomNodeType = useWorkflowStore((s) => s.removeCustomNodeType);
  const addCustomCategory = useWorkflowStore((s) => s.addCustomCategory);
  const collapsed = useWorkflowStore((s) => s.palettCollapsed);
  const togglePalette = useWorkflowStore((s) => s.togglePalette);

  const customTypeSet = useMemo(
    () => new Set(customNodeTypes.map((d) => d.type)),
    [customNodeTypes]
  );

  // Build category trees - split into built-in and custom
  const { builtInTree, customTree } = useMemo(() => {
    const all = nodeRegistry.getAll();
    const filtered = search.trim()
      ? all.filter(
          (d) =>
            d.label.toLowerCase().includes(search.toLowerCase()) ||
            d.description?.toLowerCase().includes(search.toLowerCase()) ||
            d.type.toLowerCase().includes(search.toLowerCase())
        )
      : all;

    // Split nodes into built-in and custom
    const builtInNodes = filtered.filter((d) => {
      const topCategory = d.category.split("/")[0];
      return BUILTIN_CATEGORIES.has(topCategory) && !customTypeSet.has(d.type);
    });
    const customNodes = filtered.filter((d) => {
      const topCategory = d.category.split("/")[0];
      return !BUILTIN_CATEGORIES.has(topCategory) || customTypeSet.has(d.type);
    });

    return {
      builtInTree: buildCategoryTree(builtInNodes, []),
      customTree: buildCategoryTree(customNodes, customCategories),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, registryVersion, customCategories, customTypeSet]);

  const handleAddCategory = useCallback(() => {
    setAddCategoryModalOpen(true);
  }, []);

  const handleAddCategorySubmit = useCallback(
    (name: string) => {
      addCustomCategory(name.trim());
    },
    [addCustomCategory]
  );

  const handleDeleteCustomNode = useCallback((type: string) => {
    setNodeTypeToDelete(type);
    setDeleteNodeModalOpen(true);
  }, []);

  const handleDeleteNodeConfirm = useCallback(() => {
    if (nodeTypeToDelete) {
      removeCustomNodeType(nodeTypeToDelete);
    }
  }, [nodeTypeToDelete, removeCustomNodeType]);

  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-700 flex flex-col h-full items-center py-2">
        <button
          onClick={togglePalette}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          title="Expand Node Palette"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[250px] shrink-0 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-700 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Node Palette</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddCategory}
              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              title="Create new category"
            >
              <Plus className="w-3 h-3" />
              New
            </button>
            <button
              onClick={togglePalette}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Collapse palette"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-8 pr-3 py-1.5 text-sm rounded-md",
              "border border-slate-200 bg-slate-50",
              "dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500"
            )}
          />
        </div>
      </div>

      {/* Categories - Split into two sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Node Library (Built-in) */}
        {builtInTree.children.size > 0 && (
          <div className="border-b border-slate-200 dark:border-zinc-700">
            <button
              onClick={() => setLibraryOpen(!libraryOpen)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider"
            >
              {libraryOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>Node Library</span>
              <span className="ml-auto text-slate-400 dark:text-slate-500 font-normal normal-case">
                {builtInTree.children.size} categories
              </span>
            </button>
            {libraryOpen && (
              <div className="py-1">
                {Array.from(builtInTree.children.values()).map((rootNode) => (
                  <CategorySection
                    key={rootNode.fullPath}
                    node={rootNode}
                    depth={0}
                    defaultOpen={search.trim().length > 0}
                    isCustomCategory={false}
                    customTypes={customTypeSet}
                    onDeleteCustomNode={handleDeleteCustomNode}
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
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 uppercase tracking-wider"
          >
            {myNodesOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span>My Nodes</span>
            <span className="ml-auto text-blue-600 dark:text-blue-400 font-normal normal-case">
              {customTree.children.size} categories
            </span>
          </button>
          {myNodesOpen && (
            <div className="py-1">
              {customTree.children.size === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No custom nodes yet
                  <br />
                  <button
                    onClick={handleAddCategory}
                    className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Create your first category
                  </button>
                </div>
              ) : (
                Array.from(customTree.children.values()).map((rootNode) => (
                  <CategorySection
                    key={rootNode.fullPath}
                    node={rootNode}
                    depth={0}
                    defaultOpen={search.trim().length > 0}
                    isCustomCategory={true}
                    customTypes={customTypeSet}
                    onDeleteCustomNode={handleDeleteCustomNode}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-slate-200 text-xs text-slate-400 text-center">
        Drag a node onto the grid
      </div>

      {/* Modals */}
      <InputModal
        isOpen={addCategoryModalOpen}
        onClose={() => setAddCategoryModalOpen(false)}
        onSubmit={handleAddCategorySubmit}
        title="Add Category"
        placeholder="Category path (e.g. Accounting/AR)"
      />

      <ConfirmModal
        isOpen={deleteNodeModalOpen}
        onClose={() => setDeleteNodeModalOpen(false)}
        onConfirm={handleDeleteNodeConfirm}
        title="Delete Node Type"
        message="Delete this node type?"
        confirmText="Delete"
        variant="danger"
      />
    </aside>
  );
}
