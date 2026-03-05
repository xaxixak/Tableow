import { useState, useRef, useCallback, useEffect } from "react";
import {
  Save,
  Upload,
  Trash2,
  FilePlus,
  Pencil,
  Check,
  LayoutGrid,
  GitBranch,
  Clock,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import type { Workflow } from "../../types/index.ts";
import { cn } from "../../lib/utils.ts";
import { InputModal } from "../Modal/InputModal";
import { ConfirmModal } from "../Modal/ConfirmModal";

export default function Toolbar() {
  const metadata = useWorkflowStore((s) => s.metadata);
  const getWorkflow = useWorkflowStore((s) => s.getWorkflow);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const updateMetadata = useWorkflowStore((s) => s.updateMetadata);
  const clear = useWorkflowStore((s) => s.clear);
  const viewMode = useWorkflowStore((s) => s.viewMode);
  const setViewMode = useWorkflowStore((s) => s.setViewMode);
  const saveToRecent = useWorkflowStore((s) => s.saveToRecent);
  const getRecentSaves = useWorkflowStore((s) => s.getRecentSaves);
  const darkMode = useWorkflowStore((s) => s.darkMode);
  const toggleDarkMode = useWorkflowStore((s) => s.toggleDarkMode);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(metadata.name);
  const [showRecent, setShowRecent] = useState(false);
  const [recentList, setRecentList] = useState<Workflow[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [newWorkflowModalOpen, setNewWorkflowModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    setSaveModalOpen(true);
  }, []);

  const handleSaveSubmit = useCallback(
    (fileName: string) => {
      const data = getWorkflow();
      // Save to file
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName.replace(/\.json$/i, "")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      // Also save to recent
      saveToRecent();
    },
    [getWorkflow, saveToRecent]
  );

  const handleQuickSave = useCallback(() => {
    saveToRecent();
  }, [saveToRecent]);

  const handleLoad = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as Workflow;
          loadWorkflow(data);
          setNameValue(data.metadata.name);
        } catch {
          alert("Invalid workflow file.");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [loadWorkflow]
  );

  const handleLoadRecent = useCallback(
    (workflow: Workflow) => {
      loadWorkflow(workflow);
      setNameValue(workflow.metadata.name);
      setShowRecent(false);
    },
    [loadWorkflow]
  );

  const handleToggleRecent = useCallback(() => {
    if (!showRecent) {
      setRecentList(getRecentSaves());
    }
    setShowRecent(!showRecent);
  }, [showRecent, getRecentSaves]);

  const handleClear = useCallback(() => {
    setClearModalOpen(true);
  }, []);

  const handleClearConfirm = useCallback(() => {
    clear();
    setNameValue("Untitled Workflow");
  }, [clear]);

  const handleNewWorkflow = useCallback(() => {
    setNewWorkflowModalOpen(true);
  }, []);

  const handleNewWorkflowConfirm = useCallback(() => {
    clear();
    setNameValue("Untitled Workflow");
  }, [clear]);

  const commitName = useCallback(() => {
    setEditingName(false);
    const trimmed = nameValue.trim() || "Untitled Workflow";
    setNameValue(trimmed);
    updateMetadata({ name: trimmed });
  }, [nameValue, updateMetadata]);

  // Close recent dropdown on click outside
  useEffect(() => {
    if (!showRecent) return;
    const handler = () => setShowRecent(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showRecent]);

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-700 shrink-0">
      {/* Workflow name */}
      <div className="flex items-center gap-1.5 min-w-0">
        {editingName ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setNameValue(metadata.name);
                  setEditingName(false);
                }
              }}
              className={cn(
                "px-2 py-0.5 text-sm font-semibold border border-blue-400 rounded",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              )}
              autoFocus
            />
            <button
              onClick={commitName}
              className="p-1 text-blue-600 hover:text-blue-800"
              title="Confirm name"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1.5 group min-w-0"
            title="Click to rename"
          >
            <span className="text-sm font-semibold text-slate-800 truncate">
              {metadata.name}
            </span>
            <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        )}
      </div>

      {/* View toggle */}
      <div className="flex items-center rounded-lg border border-slate-200 p-0.5">
        <button
          onClick={() => setViewMode("grid")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-md transition-colors",
            viewMode === "grid"
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}
          title="Grid view"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Grid</span>
        </button>
        <button
          onClick={() => setViewMode("canvas")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-md transition-colors",
            viewMode === "canvas"
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}
          title="Canvas view"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Canvas</span>
        </button>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
          "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
          "dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
        )}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleNewWorkflow}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
            "text-slate-600 hover:bg-slate-100 transition-colors"
          )}
          title="New workflow"
        >
          <FilePlus className="w-4 h-4" />
          <span className="hidden sm:inline">New</span>
        </button>

        {/* Recent saves dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleRecent();
            }}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm rounded-md",
              "text-slate-600 hover:bg-slate-100 transition-colors"
            )}
            title="Recent workflows"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Recent</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showRecent && (
            <div
              className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[220px]"
              onClick={(e) => e.stopPropagation()}
            >
              {recentList.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 text-center">
                  No recent saves
                </div>
              ) : (
                recentList.map((w) => (
                  <button
                    key={w.metadata.id}
                    onClick={() => handleLoadRecent(w)}
                    className="flex flex-col w-full px-3 py-1.5 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {w.metadata.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(w.metadata.updatedAt).toLocaleString()}
                    </span>
                  </button>
                ))
              )}
              <hr className="my-1 border-slate-100" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickSave();
                  setRecentList(getRecentSaves());
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
              >
                <Save className="w-3.5 h-3.5" />
                Quick Save
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
            "text-slate-600 hover:bg-slate-100 transition-colors"
          )}
          title="Load workflow from JSON"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Load</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleLoad}
          className="hidden"
        />

        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
            "text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          )}
          title="Save workflow as JSON"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          onClick={handleClear}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
            "text-red-600 hover:bg-red-50 transition-colors"
          )}
          title="Clear workflow"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Modals */}
      <InputModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSubmit={handleSaveSubmit}
        title="Save Workflow"
        placeholder="Filename (without .json)"
        defaultValue={metadata.name.replace(/\s+/g, "-").toLowerCase()}
      />

      <ConfirmModal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        onConfirm={handleClearConfirm}
        title="Clear Workflow"
        message="Clear the entire workflow? This cannot be undone."
        confirmText="Clear"
        variant="danger"
      />

      <ConfirmModal
        isOpen={newWorkflowModalOpen}
        onClose={() => setNewWorkflowModalOpen(false)}
        onConfirm={handleNewWorkflowConfirm}
        title="New Workflow"
        message="Create a new workflow? Unsaved changes will be lost."
        confirmText="Create"
        variant="danger"
      />
    </header>
  );
}
