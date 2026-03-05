import { useState, useMemo, useCallback, type DragEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  X,
  Trash2,
  Pencil,
} from "lucide-react";
import { nodeRegistry } from "../../registry/index.ts";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import type { NodeDefinition } from "../../types/index.ts";
import { cn } from "../../lib/utils.ts";

// --- Constants ---

const BASE_TYPES = [
  { value: "process", label: "Process" },
  { value: "decision", label: "Decision" },
  { value: "start", label: "Start" },
  { value: "output", label: "Output" },
] as const;

const ICON_PRESETS = [
  "\u{1F4C4}", "\u{1F4CB}", "\u{1F4E6}", "\u{1F4B0}", "\u{1F4B3}",
  "\u{1F4CA}", "\u{2705}", "\u{1F50D}", "\u{2699}\uFE0F", "\u{1F4DD}",
  "\u{1F4E8}", "\u{1F512}", "\u{1F4C1}", "\u{1F4C5}", "\u{1F465}",
];

// Built-in categories that can't be renamed/deleted
const BUILTIN_CATEGORIES = new Set(["General", "Accounting"]);

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
        <div className="text-sm font-medium text-slate-800 truncate">
          {definition.label}
        </div>
        {definition.description && (
          <div className="text-xs text-slate-500 leading-snug mt-0.5">
            {definition.description}
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
  category,
  onClose,
}: {
  category: string;
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
        category,
        icon,
        baseType: baseType as "process" | "decision" | "start" | "output",
      });
      onClose();
    },
    [label, category, icon, baseType, addCustomNodeType, onClose]
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

// --- Category Section ---

function CategorySection({
  category,
  definitions,
  defaultOpen,
  isCustomCategory,
  customTypes,
  onDeleteCustomNode,
}: {
  category: string;
  definitions: NodeDefinition[];
  defaultOpen: boolean;
  isCustomCategory: boolean;
  customTypes: Set<string>;
  onDeleteCustomNode: (type: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [addingNode, setAddingNode] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const removeCustomCategory = useWorkflowStore((s) => s.removeCustomCategory);
  const renameCustomCategory = useWorkflowStore((s) => s.renameCustomCategory);

  const handleRenameCategory = useCallback(() => {
    const newName = window.prompt("Rename category:", category);
    if (newName?.trim() && newName.trim() !== category) {
      renameCustomCategory(category, newName.trim());
    }
  }, [category, renameCustomCategory]);

  const handleDeleteCategory = useCallback(() => {
    if (window.confirm(`Delete category "${category}" and all its custom nodes?`)) {
      removeCustomCategory(category);
    }
  }, [category, removeCustomCategory]);

  return (
    <div>
      {/* Category header */}
      <div className="flex items-center group">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-1.5 flex-1 px-3 py-2 text-xs font-semibold",
            "text-slate-500 uppercase tracking-wider hover:text-slate-700",
            "transition-colors duration-100"
          )}
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{category}</span>
          <span className="ml-auto text-slate-400 font-normal normal-case">
            {definitions.length}
          </span>
        </button>
        {/* Category action buttons */}
        <div className="flex gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Add node button (all categories) */}
          <button
            onClick={() => { setOpen(true); setAddingNode(true); }}
            className="p-1 text-slate-400 hover:text-blue-500 rounded"
            title="Add node to this category"
          >
            <Plus className="w-3 h-3" />
          </button>
          {/* Edit/delete (custom categories only) */}
          {isCustomCategory && (
            <>
              <button onClick={handleRenameCategory}
                className="p-1 text-slate-400 hover:text-blue-500 rounded" title="Rename category">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={handleDeleteCategory}
                className="p-1 text-slate-400 hover:text-red-500 rounded" title="Delete category">
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category content */}
      {open && (
        <>
          {/* Existing nodes */}
          <div className="flex flex-col gap-0.5 pb-1">
            {definitions.map((def) => (
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

          {/* Add node form */}
          {addingNode && (
            <AddNodeForm category={category} onClose={() => setAddingNode(false)} />
          )}
        </>
      )}
    </div>
  );
}

// --- Main NodePalette ---

export default function NodePalette() {
  const [search, setSearch] = useState("");
  const registryVersion = useWorkflowStore((s) => s.registryVersion);
  const customNodeTypes = useWorkflowStore((s) => s.customNodeTypes);
  const customCategories = useWorkflowStore((s) => s.customCategories);
  const removeCustomNodeType = useWorkflowStore((s) => s.removeCustomNodeType);
  const addCustomCategory = useWorkflowStore((s) => s.addCustomCategory);

  const customTypeSet = useMemo(
    () => new Set(customNodeTypes.map((d) => d.type)),
    [customNodeTypes]
  );

  const customCatSet = useMemo(
    () => new Set(customCategories),
    [customCategories]
  );

  const categorized = useMemo(() => {
    const all = nodeRegistry.getAll();
    const filtered = search.trim()
      ? all.filter(
          (d) =>
            d.label.toLowerCase().includes(search.toLowerCase()) ||
            d.description?.toLowerCase().includes(search.toLowerCase()) ||
            d.type.toLowerCase().includes(search.toLowerCase())
        )
      : all;

    const categories = new Map<string, NodeDefinition[]>();
    for (const def of filtered) {
      const list = categories.get(def.category) ?? [];
      list.push(def);
      categories.set(def.category, list);
    }
    // Ensure empty custom categories appear
    for (const cat of customCategories) {
      if (!categories.has(cat)) {
        categories.set(cat, []);
      }
    }
    return categories;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, registryVersion, customCategories]);

  const handleAddCategory = useCallback(() => {
    const name = window.prompt("New category name:");
    if (name?.trim()) {
      addCustomCategory(name.trim());
    }
  }, [addCustomCategory]);

  const handleDeleteCustomNode = useCallback(
    (type: string) => {
      if (window.confirm("Delete this node type?")) {
        removeCustomNodeType(type);
      }
    },
    [removeCustomNodeType]
  );

  return (
    <aside className="w-[250px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">Node Palette</h2>
          <button
            onClick={handleAddCategory}
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
            title="Create new category"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-8 pr-3 py-1.5 text-sm rounded-md",
              "border border-slate-200 bg-slate-50",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
              "placeholder:text-slate-400"
            )}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto py-1">
        {categorized.size === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-slate-400">
            No nodes found
          </div>
        ) : (
          Array.from(categorized.entries()).map(([category, defs], i) => (
            <CategorySection
              key={category}
              category={category}
              definitions={defs}
              defaultOpen={i === 0 || search.trim().length > 0}
              isCustomCategory={customCatSet.has(category) || !BUILTIN_CATEGORIES.has(category)}
              customTypes={customTypeSet}
              onDeleteCustomNode={handleDeleteCustomNode}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-slate-200 text-xs text-slate-400 text-center">
        Drag a node onto the grid
      </div>
    </aside>
  );
}
