import { useState, useCallback } from "react";
import { Modal } from "../Modal/Modal";

interface PortEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (port: { name: string; type: string; label: string; multiple?: boolean }) => void;
  initialPort?: { name: string; type: string; label: string; multiple?: boolean };
  portType: 'input' | 'output';
  existingPortNames: string[];
}

export function PortEditorModal({
  isOpen,
  onClose,
  onSave,
  initialPort,
  portType,
  existingPortNames,
}: PortEditorModalProps) {
  const [name, setName] = useState(initialPort?.name ?? "");
  const [label, setLabel] = useState(initialPort?.label ?? "");
  const [type, setType] = useState(initialPort?.type ?? "document");
  const [multiple, setMultiple] = useState(initialPort?.multiple ?? false);
  const [error, setError] = useState("");

  const handleSave = useCallback(() => {
    // Validation
    if (!name.trim()) {
      setError("Port name is required");
      return;
    }
    if (!label.trim()) {
      setError("Port label is required");
      return;
    }

    // Check for duplicate names (excluding current port if editing)
    const isDuplicate = existingPortNames.some(
      (n) => n === name && n !== initialPort?.name
    );
    if (isDuplicate) {
      setError(`Port name "${name}" already exists`);
      return;
    }

    // Port name should be lowercase alphanumeric with underscores
    if (!/^[a-z0-9_]+$/.test(name)) {
      setError("Port name must be lowercase letters, numbers, and underscores only");
      return;
    }

    onSave({ name, type, label, multiple });
    handleClose();
  }, [name, label, type, multiple, existingPortNames, initialPort, onSave]);

  const handleClose = useCallback(() => {
    setName(initialPort?.name ?? "");
    setLabel(initialPort?.label ?? "");
    setType(initialPort?.type ?? "document");
    setMultiple(initialPort?.multiple ?? false);
    setError("");
    onClose();
  }, [initialPort, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`${initialPort ? "Edit" : "Add"} ${portType === 'input' ? "Input" : "Output"} Port`}>
      <div className="space-y-4">
        {error && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-md text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Port Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., document, item, data"
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Lowercase letters, numbers, and underscores only
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Port Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Document, Item, Data"
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            User-friendly display name
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Port Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          >
            <option value="document">Document</option>
            <option value="flow">Flow</option>
            <option value="data">Data</option>
            <option value="approval">Approval</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={multiple}
              onChange={(e) => setMultiple(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Allow multiple connections
            </span>
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {initialPort ? "Update Port" : "Add Port"}
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
