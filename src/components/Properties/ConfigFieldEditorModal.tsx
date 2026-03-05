import { useState, useCallback } from "react";
import { Modal } from "../Modal/Modal";
import { Plus, Trash } from "lucide-react";

interface ConfigFieldEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: {
    key: string;
    label: string;
    type: string;
    defaultValue?: unknown;
    options?: Array<{ label: string; value: string }>;
  }) => void;
  initialField?: {
    key: string;
    label: string;
    type: string;
    defaultValue?: unknown;
    options?: Array<{ label: string; value: string }>;
  };
  existingFieldKeys: string[];
}

export function ConfigFieldEditorModal({
  isOpen,
  onClose,
  onSave,
  initialField,
  existingFieldKeys,
}: ConfigFieldEditorModalProps) {
  const [key, setKey] = useState(initialField?.key ?? "");
  const [label, setLabel] = useState(initialField?.label ?? "");
  const [type, setType] = useState(initialField?.type ?? "text");
  const [defaultValue, setDefaultValue] = useState(initialField?.defaultValue ?? "");
  const [options, setOptions] = useState<Array<{ label: string; value: string }>>(
    initialField?.options ?? []
  );
  const [error, setError] = useState("");

  const handleSave = useCallback(() => {
    // Validation
    if (!key.trim()) {
      setError("Field key is required");
      return;
    }
    if (!label.trim()) {
      setError("Field label is required");
      return;
    }

    // Check for duplicate keys (excluding current field if editing)
    const isDuplicate = existingFieldKeys.some(
      (k) => k === key && k !== initialField?.key
    );
    if (isDuplicate) {
      setError(`Field key "${key}" already exists`);
      return;
    }

    // Field key should be lowercase alphanumeric with underscores
    if (!/^[a-z0-9_]+$/.test(key)) {
      setError("Field key must be lowercase letters, numbers, and underscores only");
      return;
    }

    // Validate options for select type
    if (type === "select" && options.length === 0) {
      setError("Select field must have at least one option");
      return;
    }

    const field: any = { key, label, type };

    // Set appropriate default value based on type
    if (type === "boolean") {
      field.defaultValue = Boolean(defaultValue);
    } else if (type === "number") {
      field.defaultValue = defaultValue ? Number(defaultValue) : 0;
    } else if (type === "select") {
      field.defaultValue = defaultValue || (options[0]?.value ?? "");
      field.options = options;
    } else {
      field.defaultValue = defaultValue || "";
    }

    onSave(field);
    handleClose();
  }, [key, label, type, defaultValue, options, existingFieldKeys, initialField, onSave]);

  const handleClose = useCallback(() => {
    setKey(initialField?.key ?? "");
    setLabel(initialField?.label ?? "");
    setType(initialField?.type ?? "text");
    setDefaultValue(initialField?.defaultValue ?? "");
    setOptions(initialField?.options ?? []);
    setError("");
    onClose();
  }, [initialField, onClose]);

  const handleAddOption = useCallback(() => {
    setOptions([...options, { label: "", value: "" }]);
  }, [options]);

  const handleRemoveOption = useCallback((index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  }, [options]);

  const handleOptionChange = useCallback(
    (index: number, field: 'label' | 'value', value: string) => {
      const newOptions = [...options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      setOptions(newOptions);
    },
    [options]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${initialField ? "Edit" : "Add"} Config Field`}
    >
      <div className="space-y-4">
        {error && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-md text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Field Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g., approval_required, due_date"
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Lowercase letters, numbers, and underscores only
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Field Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Approval Required, Due Date"
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            User-friendly display name
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Field Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean (Checkbox)</option>
            <option value="select">Select (Dropdown)</option>
            <option value="textarea">Textarea</option>
          </select>
        </div>

        {type === "select" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Options
              </label>
              <button
                onClick={handleAddOption}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Option
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => handleOptionChange(i, 'label', e.target.value)}
                    placeholder="Label"
                    className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <input
                    type="text"
                    value={opt.value}
                    onChange={(e) => handleOptionChange(i, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <button
                    onClick={() => handleRemoveOption(i)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Default Value
          </label>
          {type === "boolean" ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(defaultValue)}
                onChange={(e) => setDefaultValue(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {defaultValue ? "Enabled" : "Disabled"}
              </span>
            </label>
          ) : type === "select" ? (
            <select
              value={String(defaultValue)}
              onChange={(e) => setDefaultValue(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : type === "textarea" ? (
            <textarea
              value={String(defaultValue)}
              onChange={(e) => setDefaultValue(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-y"
            />
          ) : (
            <input
              type={type === "number" ? "number" : "text"}
              value={String(defaultValue)}
              onChange={(e) => setDefaultValue(type === "number" ? Number(e.target.value) : e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {initialField ? "Update Field" : "Add Field"}
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded-md border border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
