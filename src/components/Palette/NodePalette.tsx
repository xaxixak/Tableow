import { useState, useMemo, useCallback, useEffect, useRef, type DragEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  Pencil,
  MoreVertical,
  LayoutGrid,
} from "lucide-react";
import { nodeRegistry } from "../../registry/index.ts";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import type { NodeDefinition } from "../../types/index.ts";
import { cn } from "../../lib/utils.ts";
import { getColorByIndex, COLOR_PALETTE } from "../../lib/categoryColors.ts";
import { Modal } from "../Modal/Modal";
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
  const customCategories = useWorkflowStore((s) => s.customCategories);
  const catDef = customCategories.find((c) => c.path === definition.category);
  const catColor = getColorByIndex(catDef?.colorIndex);

  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/reactflow-type", definition.type);
    // Also set palette-move data so categories can accept node reordering
    if (isCustom) {
      event.dataTransfer.setData("application/palette-node-move", definition.type);
    }
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
        <span
          className="flex items-center justify-center w-6 h-6 rounded text-sm leading-none shrink-0 text-white"
          style={{ backgroundColor: catColor.hex }}
        >
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

// --- Add Node Modal ---

function AddNodeModal({
  isOpen,
  categoryPath,
  onClose,
}: {
  isOpen: boolean;
  categoryPath: string;
  onClose: () => void;
}) {
  const addCustomNodeType = useWorkflowStore((s) => s.addCustomNodeType);
  const [label, setLabel] = useState("");
  const [baseType, setBaseType] = useState("process");
  const [icon, setIcon] = useState(ICON_PRESETS[0]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setLabel("");
      setBaseType("process");
      setIcon(ICON_PRESETS[0]);
    }
  }, [isOpen]);

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
    "w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 dark:border-zinc-600",
    "bg-white dark:bg-zinc-700 dark:text-slate-200",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Node" maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Node Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter node name"
              className={inputCls}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Type
            </label>
            <select value={baseType} onChange={(e) => setBaseType(e.target.value as typeof baseType)} className={inputCls}>
              {BASE_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>{bt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Icon
            </label>
            <div className="flex gap-1 flex-wrap">
              {ICON_PRESETS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-md text-base border transition-colors",
                    icon === ic
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500"
                      : "border-slate-200 dark:border-zinc-600 hover:border-slate-300 dark:hover:border-zinc-500"
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-zinc-500">
            Category: <span className="font-medium text-slate-600 dark:text-slate-300">{categoryPath}</span>
          </div>
          <button
            type="submit"
            disabled={!label.trim()}
            className={cn(
              "w-full py-2 text-sm font-medium rounded-md transition-colors",
              "bg-blue-600 text-white hover:bg-blue-700",
              "disabled:bg-slate-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed"
            )}
          >
            Add Node
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Edit Node Modal ---

function EditNodeModal({
  isOpen,
  definition,
  onClose,
}: {
  isOpen: boolean;
  definition: NodeDefinition | null;
  onClose: () => void;
}) {
  const updateCustomNodeType = useWorkflowStore((s) => s.updateCustomNodeType);
  const customCategories = useWorkflowStore((s) => s.customCategories);
  const currentBase = definition
    ? definition.flowType ?? (
        definition.inputs.length === 0 ? "start"
        : definition.outputs.length === 0 ? "output"
        : definition.outputs.length >= 2 ? "decision"
        : "process"
      )
    : "process";

  const [label, setLabel] = useState(definition?.label ?? "");
  const [description, setDescription] = useState(definition?.description ?? "");
  const [icon, setIcon] = useState(definition?.icon ?? ICON_PRESETS[0]);
  const [baseType, setBaseType] = useState(currentBase);
  const [category, setCategory] = useState(definition?.category ?? "");

  // Sync form when definition changes
  useEffect(() => {
    if (definition && isOpen) {
      setLabel(definition.label);
      setDescription(definition.description ?? "");
      setIcon(definition.icon ?? ICON_PRESETS[0]);
      setCategory(definition.category);
      const base = definition.flowType ?? (
        definition.inputs.length === 0 ? "start"
        : definition.outputs.length === 0 ? "output"
        : definition.outputs.length >= 2 ? "decision"
        : "process"
      );
      setBaseType(base);
    }
  }, [definition, isOpen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!label.trim() || !definition) return;
      updateCustomNodeType(definition.type, {
        label: label.trim(),
        description: description.trim() || undefined,
        icon,
        baseType: baseType as "process" | "decision" | "start" | "output" | "document",
        category,
      });
      onClose();
    },
    [label, description, icon, baseType, category, definition, updateCustomNodeType, onClose]
  );

  const inputCls = cn(
    "w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 dark:border-zinc-600",
    "bg-white dark:bg-zinc-700 dark:text-slate-200",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Node" maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Node Name
            </label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="Node name" className={inputCls} autoFocus required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Description
            </label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Category
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {customCategories.map((cat) => (
                <option key={cat.path} value={cat.path}>{cat.number}: {cat.path}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Type
            </label>
            <select value={baseType} onChange={(e) => setBaseType(e.target.value as typeof baseType)} className={inputCls}>
              {BASE_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>{bt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Icon
            </label>
            <div className="flex gap-1 flex-wrap">
              {ICON_PRESETS.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-md text-base border transition-colors",
                    icon === ic
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500"
                      : "border-slate-200 dark:border-zinc-600 hover:border-slate-300 dark:hover:border-zinc-500"
                  )}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          {definition?.number && (
            <div className="text-xs text-slate-400 dark:text-zinc-500">
              Node #: <span className="font-medium text-slate-600 dark:text-slate-300">{definition.number}</span>
            </div>
          )}
          <button type="submit" disabled={!label.trim()}
            className={cn(
              "w-full py-2 text-sm font-medium rounded-md transition-colors",
              "bg-blue-600 text-white hover:bg-blue-700",
              "disabled:bg-slate-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed"
            )}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Count all definitions in a category tree (including nested subcategories)
function countAllDefinitions(node: CategoryNode): number {
  let count = node.definitions.length;
  for (const child of node.children.values()) {
    count += countAllDefinitions(child);
  }
  return count;
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
  const [addNodeModalOpen, setAddNodeModalOpen] = useState(false);
  const [editingNodeDef, setEditingNodeDef] = useState<NodeDefinition | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addSubModalOpen, setAddSubModalOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const removeCustomCategory = useWorkflowStore((s) => s.removeCustomCategory);
  const renameCustomCategory = useWorkflowStore((s) => s.renameCustomCategory);
  const addCustomCategory = useWorkflowStore((s) => s.addCustomCategory);
  const updateCategoryColor = useWorkflowStore((s) => s.updateCategoryColor);
  const customCategories = useWorkflowStore((s) => s.customCategories);
  const updateCustomNodeType = useWorkflowStore((s) => s.updateCustomNodeType);
  const [isDragOver, setIsDragOver] = useState(false);

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

  const handleCategoryDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (e.dataTransfer.types.includes("application/palette-node-move")) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }
    },
    []
  );

  const handleCategoryDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleCategoryDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const nodeType = e.dataTransfer.getData("application/palette-node-move");
      if (!nodeType) return;
      updateCustomNodeType(nodeType, { category: node.fullPath });
      setOpen(true);
    },
    [node.fullPath, updateCustomNodeType]
  );

  const darkMode = useWorkflowStore((s) => s.darkMode);
  const paddingLeft = depth * 20;

  // Per-category color from colorIndex assigned during auto-numbering
  const catDef = customCategories.find((c) => c.path === node.fullPath);
  const catColor = getColorByIndex(catDef?.colorIndex);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = () => setShowMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showMenu]);

  return (
    <div>
      {/* Category header — drop target for node reordering */}
      <div
        onDragOver={handleCategoryDragOver}
        onDragLeave={handleCategoryDragLeave}
        onDrop={handleCategoryDrop}
        className={cn(
          "flex items-center group",
          isDragOver && "ring-2 ring-inset ring-blue-500"
        )}
        style={{
          borderLeft: `4px solid ${catColor.hex}`,
          backgroundColor: isDragOver ? undefined : (darkMode ? catColor.headerDarkBgHex : catColor.headerBgHex),
          marginLeft: `${paddingLeft}px`,
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-1.5 flex-1 py-2 px-3 text-xs font-semibold",
            "text-slate-700 dark:text-slate-200 uppercase tracking-wider",
            "hover:text-slate-900 dark:hover:text-white",
            "transition-colors duration-100 hover:brightness-95 dark:hover:brightness-125"
          )}
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
            {countAllDefinitions(node) || ""}
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
                onClick={() => { setAddNodeModalOpen(true); setShowMenu(false); }}
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
              <hr className="my-1 border-slate-100" />
              <button
                onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <span
                  className="w-3 h-3 rounded-full border border-slate-300"
                  style={{ backgroundColor: catColor.hex }}
                />
                Change color
              </button>
              {showColorPicker && (
                <div className="flex flex-wrap gap-1.5 px-3 py-2">
                  {COLOR_PALETTE.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        updateCategoryColor(node.fullPath, i);
                        setShowColorPicker(false);
                        setShowMenu(false);
                      }}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-transform hover:scale-125",
                        catDef?.colorIndex === i ? "border-slate-800 scale-110" : "border-white shadow-sm"
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={`Color ${i + 1}`}
                    />
                  ))}
                </div>
              )}
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
          {/* Nodes at this level — also accepts drops for cross-category moves */}
          <div
            onDragOver={handleCategoryDragOver}
            onDragLeave={handleCategoryDragLeave}
            onDrop={handleCategoryDrop}
            className={cn(
              "flex flex-col gap-0.5 pb-1",
              !hasDefinitions && "min-h-[32px]",
              isDragOver && !hasDefinitions && "bg-blue-50 dark:bg-blue-950/30 rounded-sm"
            )}
            style={{ paddingLeft: `${paddingLeft + 20}px` }}
          >
            {hasDefinitions ? (
              node.definitions.map((def) => (
                <NodePaletteItem
                  key={def.type}
                  definition={def}
                  isCustom={customTypes.has(def.type)}
                  onEdit={() => setEditingNodeDef(def)}
                  onDelete={() => onDeleteCustomNode(def.type)}
                />
              ))
            ) : (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 py-1 italic">
                {isDragOver ? "Drop here" : "No nodes — drag to add"}
              </div>
            )}
          </div>

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
      <AddNodeModal
        isOpen={addNodeModalOpen}
        categoryPath={node.fullPath}
        onClose={() => setAddNodeModalOpen(false)}
      />

      <EditNodeModal
        key={editingNodeDef?.type ?? ""}
        isOpen={editingNodeDef !== null}
        definition={editingNodeDef}
        onClose={() => setEditingNodeDef(null)}
      />

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
  const [canvasOnlyOpen, setCanvasOnlyOpen] = useState(true); // Canvas Only expanded by default
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [deleteNodeModalOpen, setDeleteNodeModalOpen] = useState(false);
  const [nodeTypeToDelete, setNodeTypeToDelete] = useState<string>("");
  const registryVersion = useWorkflowStore((s) => s.registryVersion);
  const customNodeTypes = useWorkflowStore((s) => s.customNodeTypes);
  const customCategories = useWorkflowStore((s) => s.customCategories);
  const removeCustomNodeType = useWorkflowStore((s) => s.removeCustomNodeType);
  const addCustomCategory = useWorkflowStore((s) => s.addCustomCategory);
  const collapsed = useWorkflowStore((s) => s.palettCollapsed);
  const paletteWidth = useWorkflowStore((s) => s.paletteWidth);
  const setPaletteWidth = useWorkflowStore((s) => s.setPaletteWidth);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const togglePalette = useWorkflowStore((s) => s.togglePalette);
  const nodes = useWorkflowStore((s) => s.nodes);
  const gridConfig = useWorkflowStore((s) => s.gridConfig);
  const viewMode = useWorkflowStore((s) => s.viewMode);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);

  // Compute unplaced nodes (canvas-only)
  const unplacedNodes = useMemo(() => {
    const { placements, lanes, stages } = gridConfig;
    const parentStageIds = new Set(stages.filter(s => s.parentId).map(s => s.parentId!));
    const parentLaneIds = new Set(lanes.filter(l => l.parentId).map(l => l.parentId!));
    return nodes.filter(n => {
      const placement = placements.find(p => p.nodeId === n.id);
      if (!placement) return true;
      if (!lanes.some(l => l.id === placement.laneId)) return true;
      if (!stages.some(s => s.id === placement.stageId)) return true;
      if (parentStageIds.has(placement.stageId)) return true;
      if (parentLaneIds.has(placement.laneId)) return true;
      return false;
    });
  }, [nodes, gridConfig]);

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

  // Palette resize drag handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: paletteWidth };
      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const delta = ev.clientX - resizeRef.current.startX;
        setPaletteWidth(resizeRef.current.startWidth + delta);
      };
      const handleMouseUp = () => {
        resizeRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [paletteWidth, setPaletteWidth]
  );

  // Auto-scroll when dragging near top/bottom edges of the scroll container
  const scrollSpeedRef = useRef(0);

  const handleScrollDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (
        !e.dataTransfer.types.includes("application/palette-node-move") &&
        !e.dataTransfer.types.includes("application/reactflow-type")
      ) return;

      const container = scrollRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const edgeZone = 40; // px from edge to trigger scroll
      const maxSpeed = 12; // px per frame

      if (y < edgeZone) {
        scrollSpeedRef.current = -Math.ceil(maxSpeed * (1 - y / edgeZone));
      } else if (y > rect.height - edgeZone) {
        const distFromBottom = rect.height - y;
        scrollSpeedRef.current = Math.ceil(maxSpeed * (1 - distFromBottom / edgeZone));
      } else {
        scrollSpeedRef.current = 0;
      }

      // Start interval if not already running and speed is non-zero
      if (scrollSpeedRef.current !== 0 && !scrollIntervalRef.current) {
        scrollIntervalRef.current = window.setInterval(() => {
          if (scrollRef.current && scrollSpeedRef.current !== 0) {
            scrollRef.current.scrollTop += scrollSpeedRef.current;
          }
        }, 16);
      } else if (scrollSpeedRef.current === 0 && scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    },
    []
  );

  const handleScrollDragLeave = useCallback(() => {
    scrollSpeedRef.current = 0;
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

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
    <aside
      className="relative shrink-0 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-700 flex flex-col h-full overflow-hidden"
      style={{ width: `${paletteWidth}px` }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 hover:bg-blue-400/40 active:bg-blue-500/50 transition-colors"
      />
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
      <div
        ref={scrollRef}
        onDragOver={handleScrollDragOver}
        onDragLeave={handleScrollDragLeave}
        onDrop={handleScrollDragLeave}
        className="flex-1 overflow-y-auto"
      >
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
          <div className="flex items-center bg-blue-100 dark:bg-blue-900/30">
            <button
              onClick={() => setMyNodesOpen(!myNodesOpen)}
              className="flex items-center gap-2 flex-1 px-3 py-2 text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 uppercase tracking-wider"
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
          </div>
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

        {/* Canvas Only — unplaced node instances (only in canvas mode or when unplaced nodes exist) */}
        {unplacedNodes.length > 0 && (
          <div className="border-t border-orange-200 dark:border-orange-800">
            <button
              onClick={() => setCanvasOnlyOpen(!canvasOnlyOpen)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold bg-orange-100 dark:bg-orange-950/40 hover:bg-orange-200 dark:hover:bg-orange-900/40 text-orange-700 dark:text-orange-400 uppercase tracking-wider"
            >
              {canvasOnlyOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>Canvas Only</span>
              <span className="ml-auto font-normal normal-case">
                {unplacedNodes.length}
              </span>
            </button>
            {canvasOnlyOpen && (
              <div className="py-1 bg-orange-50/50 dark:bg-orange-950/20">
                <div className="px-3 py-1 text-[10px] text-orange-500 dark:text-orange-400">
                  Nodes not placed in any grid cell
                </div>
                {unplacedNodes.map((node) => {
                  const def = node.type ? nodeRegistry.get(node.type) : undefined;
                  const catDef = customCategories.find(c => c.path === (def?.category ?? ""));
                  const catColor = getColorByIndex(catDef?.colorIndex);
                  const label = (node.data.label as string) ?? def?.label ?? node.type ?? "Node";
                  return (
                    <div
                      key={node.id}
                      onClick={() => selectNode(node.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer group",
                        "border border-dashed border-orange-300 dark:border-orange-700",
                        "hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors"
                      )}
                    >
                      {def?.icon && (
                        <span
                          className="flex items-center justify-center w-5 h-5 rounded text-xs text-white shrink-0"
                          style={{ backgroundColor: catColor.hex }}
                        >
                          {def.icon}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-orange-700 dark:text-orange-400 truncate">
                          {def?.number && (
                            <span className="font-mono text-[10px] text-orange-400 dark:text-orange-500 mr-1">
                              {def.number}
                            </span>
                          )}
                          {label}
                        </div>
                        {def?.category && (
                          <div className="text-[10px] text-orange-400 dark:text-orange-600 truncate">
                            {def.category}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete "${label}"?`)) {
                            removeNode(node.id);
                          }
                        }}
                        className="p-0.5 text-orange-300 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete node"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
