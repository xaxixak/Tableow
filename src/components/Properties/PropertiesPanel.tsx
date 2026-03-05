import { useMemo, useCallback } from "react";
import { Trash2, X, ChevronRight, Settings2 } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { nodeRegistry } from "../../registry/index.ts";
import type { ConfigFieldDefinition } from "../../types/index.ts";
import { cn } from "../../lib/utils.ts";

function ConfigFieldDefinitionInput({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldDefinition;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  const inputClasses = cn(
    "w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200",
    "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
  );

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClasses}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? 0}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
          className={inputClasses}
        />
      );

    case "select":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClasses}
        >
          {field.options?.map((opt: { label: string; value: string }) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case "boolean":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(field.key, e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
          />
          <span className="text-sm text-slate-600">
            {value ? "Enabled" : "Disabled"}
          </span>
        </label>
      );

    case "textarea":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          rows={3}
          className={cn(inputClasses, "resize-y")}
        />
      );

    default:
      return null;
  }
}

export default function PropertiesPanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const collapsed = useWorkflowStore((s) => s.propertiesCollapsed);
  const toggleProperties = useWorkflowStore((s) => s.toggleProperties);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const definition = useMemo(() => {
    if (!selectedNode?.type) return undefined;
    return nodeRegistry.get(selectedNode.type);
  }, [selectedNode?.type]);

  const config = selectedNode?.data?.config as
    | Record<string, unknown>
    | undefined;

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return;
      updateNodeConfig(selectedNodeId, { [key]: value });
    },
    [selectedNodeId, updateNodeConfig]
  );

  const handleDelete = useCallback(() => {
    if (!selectedNodeId) return;
    if (window.confirm("Delete this node?")) {
      removeNode(selectedNodeId);
    }
  }, [selectedNodeId, removeNode]);

  const handleClose = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Collapsed state
  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 bg-white border-l border-slate-200 flex flex-col h-full items-center py-2">
        <button
          onClick={toggleProperties}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Expand Properties"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // Empty state
  if (!selectedNode || !definition) {
    return (
      <aside className="w-[300px] shrink-0 bg-white border-l border-slate-200 flex flex-col h-full">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Properties</h2>
          <button
            onClick={toggleProperties}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Collapse properties"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-slate-400 text-center">
            Select a node on the canvas to view its properties
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[300px] shrink-0 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 truncate">
          Properties
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded"
            title="Deselect node"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={toggleProperties}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Collapse properties"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Node info */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            {definition.icon && (
              <span className="text-lg leading-none">{definition.icon}</span>
            )}
            <span className="text-sm font-semibold text-slate-800">
              {definition.label}
            </span>
          </div>
          {definition.description && (
            <p className="text-xs text-slate-500 mt-1">
              {definition.description}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              {definition.category}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              {definition.type}
            </span>
          </div>
        </div>

        {/* Ports info */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Ports
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400">Inputs:</span>{" "}
              <span className="text-slate-700">
                {definition.inputs.length === 0
                  ? "None"
                  : definition.inputs.map((p) => p.label ?? p.name).join(", ")}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Outputs:</span>{" "}
              <span className="text-slate-700">
                {definition.outputs.length === 0
                  ? "None"
                  : definition.outputs
                      .map((p) => p.label ?? p.name)
                      .join(", ")}
              </span>
            </div>
          </div>
        </div>

        {/* Config form */}
        {definition.configSchema && definition.configSchema.length > 0 && (
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Configuration
            </div>
            <div className="flex flex-col gap-3">
              {definition.configSchema.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {field.label}
                  </label>
                  <ConfigFieldDefinitionInput
                    field={field}
                    value={config?.[field.key] ?? field.defaultValue}
                    onChange={handleFieldChange}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer - delete button */}
      <div className="px-4 py-3 border-t border-slate-200">
        <button
          onClick={handleDelete}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full px-3 py-2 text-sm rounded-md",
            "text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
          )}
        >
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </aside>
  );
}
