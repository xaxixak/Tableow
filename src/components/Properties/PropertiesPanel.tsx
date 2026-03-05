import { useMemo, useCallback, useState } from "react";
import { Trash2, X, ChevronRight, Settings2, Plus, Edit, Trash } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { nodeRegistry } from "../../registry/index.ts";
import type { ConfigFieldDefinition } from "../../types/index.ts";
import { cn } from "../../lib/utils.ts";
import { ConfigFieldEditorModal } from "./ConfigFieldEditorModal";

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
    "bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
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
  const edges = useWorkflowStore((s) => s.edges);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const collapsed = useWorkflowStore((s) => s.propertiesCollapsed);
  const toggleProperties = useWorkflowStore((s) => s.toggleProperties);
  const customCategories = useWorkflowStore((s) => s.customCategories);
  const registryVersion = useWorkflowStore((s) => s.registryVersion);
  const updateCustomNodeDefinition = useWorkflowStore((s) => s.updateCustomNodeDefinition);
  const addPortToCustomNode = useWorkflowStore((s) => s.addPortToCustomNode);
  const removePortFromCustomNode = useWorkflowStore((s) => s.removePortFromCustomNode);
  const updatePortOnCustomNode = useWorkflowStore((s) => s.updatePortOnCustomNode);
  const addConfigFieldToCustomNode = useWorkflowStore((s) => s.addConfigFieldToCustomNode);
  const removeConfigFieldFromCustomNode = useWorkflowStore((s) => s.removeConfigFieldFromCustomNode);
  const updateConfigFieldOnCustomNode = useWorkflowStore((s) => s.updateConfigFieldOnCustomNode);

  const [editMode, setEditMode] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFlowType, setEditFlowType] = useState<"start" | "process" | "decision" | "output" | "end" | "subprocess" | "document">("process");
  const [configEditorOpen, setConfigEditorOpen] = useState(false);
  const [editingConfigField, setEditingConfigField] = useState<ConfigFieldDefinition | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const definition = useMemo(() => {
    if (!selectedNode?.type) return undefined;
    return nodeRegistry.get(selectedNode.type);
  }, [selectedNode?.type, registryVersion]);

  // Get connected nodes
  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) return { inputs: [], outputs: [] };

    const inputEdges = edges.filter((e) => e.target === selectedNodeId);
    const outputEdges = edges.filter((e) => e.source === selectedNodeId);

    const inputNodes = inputEdges.map((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      return sourceNode?.data?.label || sourceNode?.type || 'Unknown';
    });

    const outputNodes = outputEdges.map((e) => {
      const targetNode = nodes.find((n) => n.id === e.target);
      return targetNode?.data?.label || targetNode?.type || 'Unknown';
    });

    return { inputs: inputNodes, outputs: outputNodes };
  }, [selectedNodeId, edges, nodes]);

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

  const handleEditToggle = useCallback(() => {
    if (!editMode && definition) {
      // Entering edit mode - populate form
      setEditLabel(definition.label);
      setEditDescription(definition.description ?? "");
      setEditCategory(definition.category);
      setEditFlowType(definition.flowType);
    }
    setEditMode(!editMode);
  }, [editMode, definition]);

  const handleSaveDefinition = useCallback(() => {
    if (!selectedNode?.type || !definition) return;

    updateCustomNodeDefinition(selectedNode.type, {
      label: editLabel,
      description: editDescription,
      category: editCategory,
      flowType: editFlowType,
    });

    setEditMode(false);
  }, [selectedNode, definition, editLabel, editDescription, editCategory, editFlowType, updateCustomNodeDefinition]);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
  }, []);

  const handleAddConfigField = useCallback(() => {
    setEditingConfigField(null);
    setConfigEditorOpen(true);
  }, []);

  const handleEditConfigField = useCallback((field: ConfigFieldDefinition) => {
    setEditingConfigField(field);
    setConfigEditorOpen(true);
  }, []);

  const handleDeleteConfigField = useCallback((fieldKey: string) => {
    if (!selectedNode?.type) return;
    if (window.confirm(`Delete config field "${fieldKey}"?`)) {
      removeConfigFieldFromCustomNode(selectedNode.type, fieldKey);
    }
  }, [selectedNode, removeConfigFieldFromCustomNode]);

  const handleSaveConfigField = useCallback(
    (field: {
      key: string;
      label: string;
      type: string;
      defaultValue?: unknown;
      options?: Array<{ label: string; value: string }>;
    }) => {
      if (!selectedNode?.type) return;

      if (editingConfigField) {
        // Updating existing field
        updateConfigFieldOnCustomNode(selectedNode.type, editingConfigField.key, field);
      } else {
        // Adding new field
        addConfigFieldToCustomNode(selectedNode.type, field);
      }

      setConfigEditorOpen(false);
      setEditingConfigField(null);
    },
    [selectedNode, editingConfigField, addConfigFieldToCustomNode, updateConfigFieldOnCustomNode]
  );

  const handleCloseConfigEditor = useCallback(() => {
    setConfigEditorOpen(false);
    setEditingConfigField(null);
  }, []);

  // Collapsed state
  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700 flex flex-col h-full items-center py-2">
        <button
          onClick={toggleProperties}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
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
      <aside className="w-[300px] shrink-0 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700 flex flex-col h-full">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Properties</h2>
          <button
            onClick={toggleProperties}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
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
    <aside className="w-[300px] shrink-0 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
          Properties
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded"
            title="Deselect node"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={toggleProperties}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Collapse properties"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Node info */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            {definition.icon && (
              <span className="text-lg leading-none">{definition.icon}</span>
            )}
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {definition.label}
            </span>
          </div>
          {definition.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {definition.description}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">
              {definition.category}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">
              {definition.type}
            </span>
          </div>
        </div>

        {/* Ports info - show connected nodes */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Ports
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500">Inputs:</span>{" "}
              <span className="text-slate-700 dark:text-slate-300">
                {connectedNodes.inputs.length === 0
                  ? "None"
                  : connectedNodes.inputs.join(", ")}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Outputs:</span>{" "}
              <span className="text-slate-700 dark:text-slate-300">
                {connectedNodes.outputs.length === 0
                  ? "None"
                  : connectedNodes.outputs.join(", ")}
              </span>
            </div>
          </div>
        </div>

        {/* Config form */}
        {definition.configSchema && definition.configSchema.length > 0 && (
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Configuration
            </div>
            <div className="flex flex-col gap-3">
              {definition.configSchema.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
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

        {/* Edit Definition (for custom nodes) */}
        {definition.customizable && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Node Definition
              </div>
              <button
                onClick={handleEditToggle}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {editMode ? "Cancel" : "Edit"}
              </button>
            </div>

            {!editMode ? (
              <div className="space-y-2 text-sm">
                {definition.number && (
                  <div>
                    <span className="text-slate-400 dark:text-slate-500">Number: </span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono">
                      {definition.number}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 dark:text-slate-500">Flow Type: </span>
                  <span className="text-slate-700 dark:text-slate-300 capitalize">
                    {definition.flowType}
                  </span>
                </div>
                {definition.documentType && (
                  <div>
                    <span className="text-slate-400 dark:text-slate-500">Document: </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {definition.documentType}
                    </span>
                  </div>
                )}
                {(selectedNode.data.laneId || selectedNode.data.stageId) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Grid Position
                    </div>
                    {selectedNode.data.laneId && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500">Lane: </span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {selectedNode.data.laneId}
                        </span>
                      </div>
                    )}
                    {selectedNode.data.stageId && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500">Stage: </span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {selectedNode.data.stageId}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {definition.sourceTemplateType && (
                  <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
                    <span className="text-slate-400 dark:text-slate-500">Based on: </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {definition.sourceTemplateType}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {definition.number && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Number (read-only)
                    </label>
                    <input
                      type="text"
                      value={definition.number}
                      disabled
                      className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-slate-50 dark:bg-zinc-800/50 dark:border-zinc-600 dark:text-slate-400 font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-y"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  >
                    {customCategories.map((cat) => (
                      <option key={cat.path} value={cat.path}>
                        {cat.number}: {cat.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Flow Type
                  </label>
                  <select
                    value={editFlowType}
                    onChange={(e) => setEditFlowType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  >
                    <option value="start">Start</option>
                    <option value="process">Process</option>
                    <option value="decision">Decision</option>
                    <option value="output">Output</option>
                    <option value="end">End</option>
                    <option value="subprocess">Subprocess</option>
                    <option value="document">Document</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Determines node shape and workflow behavior
                  </p>
                </div>

                {/* Port Quantity Management */}
                <div className="border-t border-slate-200 dark:border-zinc-700 pt-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Input Port Quantity
                      </label>
                      <select
                        value={definition.inputs.length}
                        onChange={(e) => {
                          if (!selectedNode) return;
                          const targetCount = parseInt(e.target.value);

                          // Generate the exact number of ports needed
                          const newInputs = Array.from({ length: targetCount }, (_, i) => ({
                            name: `in_${i + 1}`,
                            type: 'document',
                            label: `Input ${i + 1}`,
                          }));

                          // Update the entire inputs array atomically
                          updateCustomNodeDefinition(selectedNode.type, {
                            inputs: newInputs,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      >
                        <option value="0">0 (No inputs)</option>
                        <option value="1">1 input</option>
                        <option value="2">2 inputs</option>
                        <option value="3">3 inputs</option>
                        <option value="4">4 inputs</option>
                        <option value="5">5 inputs</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Ports auto-named from connected nodes
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Output Port Quantity
                      </label>
                      <select
                        value={definition.outputs.length}
                        onChange={(e) => {
                          if (!selectedNode) return;
                          const targetCount = parseInt(e.target.value);

                          // Generate the exact number of ports needed
                          const newOutputs = Array.from({ length: targetCount }, (_, i) => ({
                            name: `out_${i + 1}`,
                            type: 'document',
                            label: `Output ${i + 1}`,
                          }));

                          // Update the entire outputs array atomically
                          updateCustomNodeDefinition(selectedNode.type, {
                            outputs: newOutputs,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      >
                        <option value="0">0 (No outputs)</option>
                        <option value="1">1 output</option>
                        <option value="2">2 outputs</option>
                        <option value="3">3 outputs</option>
                        <option value="4">4 outputs</option>
                        <option value="5">5 outputs</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Ports auto-named from connected nodes
                      </p>
                    </div>

                    {(definition.inputs.length > 0 || definition.outputs.length > 0) && (
                      <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Current ports: {definition.inputs.length} in, {definition.outputs.length} out
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Config Field Management */}
                <div className="border-t border-slate-200 dark:border-zinc-700 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Config Fields
                    </label>
                    <button
                      onClick={handleAddConfigField}
                      className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Add config field"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {!definition.configSchema || definition.configSchema.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No config fields</p>
                    ) : (
                      definition.configSchema.map((field) => (
                        <div
                          key={field.key}
                          className="flex items-center justify-between px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 rounded text-xs"
                        >
                          <span className="text-slate-700 dark:text-slate-300">
                            {field.label} <span className="text-slate-400">({field.type})</span>
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditConfigField(field)}
                              className="p-0.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Edit field"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteConfigField(field.key)}
                              className="p-0.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete field"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveDefinition}
                    className="flex-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer - delete button */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-zinc-700">
        <button
          onClick={handleDelete}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full px-3 py-2 text-sm rounded-md",
            "text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50",
            "hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          )}
        >
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>

      {/* Config Field Editor Modal */}
      {definition?.customizable && (
        <ConfigFieldEditorModal
          isOpen={configEditorOpen}
          onClose={handleCloseConfigEditor}
          onSave={handleSaveConfigField}
          initialField={editingConfigField ?? undefined}
          existingFieldKeys={definition.configSchema?.map((f) => f.key) ?? []}
        />
      )}
    </aside>
  );
}
