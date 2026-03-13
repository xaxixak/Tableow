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
  Undo2,
  Redo2,
  Link2,
  SaveAll,
  GitMerge,
  Copy,
  Clipboard,
  Hash,
} from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import type { Workflow } from "../../types/index.ts";
import { cn } from "../../lib/utils.ts";
import { InputModal } from "../Modal/InputModal";
import { ConfirmModal } from "../Modal/ConfirmModal";
import { LinkOverviewModal } from "../Modal/LinkOverviewModal";

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
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const historyIndex = useWorkflowStore((s) => s.historyIndex);
  const historyLength = useWorkflowStore((s) => s.history.length);
  const canUndoNow = historyIndex > 0;
  const canRedoNow = historyIndex < historyLength - 1;
  const importWorkflow = useWorkflowStore((s) => s.importWorkflow);
  const copySelectedNodes = useWorkflowStore((s) => s.copySelectedNodes);
  const pasteNodes = useWorkflowStore((s) => s.pasteNodes);
  const selectedNodeIds = useWorkflowStore((s) => s.selectedNodeIds);
  const clipboardExists = useWorkflowStore((s) => s.clipboard !== null);
  const renumberAll = useWorkflowStore((s) => s.renumberAll);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(metadata.name);
  const [showRecent, setShowRecent] = useState(false);
  const [recentList, setRecentList] = useState<Workflow[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [newWorkflowModalOpen, setNewWorkflowModalOpen] = useState(false);
  const [linkOverviewOpen, setLinkOverviewOpen] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImportWorkflow, setPendingImportWorkflow] = useState<Workflow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Sync nameValue when metadata.name changes (e.g., after loadWorkflow)
  useEffect(() => {
    setNameValue(metadata.name);
  }, [metadata.name]);

  const downloadWorkflow = useCallback(
    (fileName: string) => {
      const data = getWorkflow();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName.replace(/\.json$/i, "")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      saveToRecent();
    },
    [getWorkflow, saveToRecent]
  );

  const handleSave = useCallback(() => {
    if (currentFileName) {
      // Re-save with the same filename
      downloadWorkflow(currentFileName);
    } else {
      // First time: ask for filename
      setSaveModalOpen(true);
    }
  }, [currentFileName, downloadWorkflow]);

  const handleSaveAs = useCallback(() => {
    setSaveModalOpen(true);
  }, []);

  const handleSaveSubmit = useCallback(
    (fileName: string) => {
      const cleanName = fileName.replace(/\.json$/i, "");
      downloadWorkflow(cleanName);
      setCurrentFileName(cleanName);
    },
    [downloadWorkflow]
  );

  const handleQuickSave = useCallback(() => {
    saveToRecent();
  }, [saveToRecent]);

  const handleLoad = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const fileName = file.name.replace(/\.json$/i, "");

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as Workflow;
          // Use the filename as workflow name if metadata name is default
          if (!data.metadata.name || data.metadata.name === "Untitled Workflow") {
            data.metadata.name = fileName;
          }
          loadWorkflow(data);
          setNameValue(data.metadata.name);
          setCurrentFileName(fileName);
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
      setCurrentFileName(null);
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
    setCurrentFileName(null);
  }, [clear]);

  const handleNewWorkflow = useCallback(() => {
    setNewWorkflowModalOpen(true);
  }, []);

  const handleNewWorkflowConfirm = useCallback(() => {
    clear();
    setNameValue("Untitled Workflow");
    setCurrentFileName(null);
  }, [clear]);

  const commitName = useCallback(() => {
    setEditingName(false);
    const trimmed = nameValue.trim() || "Untitled Workflow";
    setNameValue(trimmed);
    updateMetadata({ name: trimmed });
  }, [nameValue, updateMetadata]);

  // Import handler
  const handleImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as Workflow;
          setPendingImportWorkflow(data);
          setImportConfirmOpen(true);
        } catch {
          alert("Invalid workflow file.");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    []
  );

  const handleImportConfirm = useCallback(() => {
    if (pendingImportWorkflow) {
      importWorkflow(pendingImportWorkflow);
      setPendingImportWorkflow(null);
    }
  }, [pendingImportWorkflow, importWorkflow]);

  // Keyboard shortcuts for undo/redo/copy/paste
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copySelectedNodes();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pasteNodes();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo, copySelectedNodes, pasteNodes]);

  // Close recent dropdown on click outside
  useEffect(() => {
    if (!showRecent) return;
    const handler = () => setShowRecent(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showRecent]);

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-700 shrink-0">
      {/* App name & version */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm font-bold bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          TableOW
        </span>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">1.1</span>
      </div>

      {/* View toggle */}
      <div className="flex items-center rounded-lg border border-slate-200 dark:border-zinc-700 p-0.5">
        <button
          onClick={() => setViewMode("grid")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-md transition-colors",
            viewMode === "grid"
              ? "bg-blue-600 text-white"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
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
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
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

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={undo}
          disabled={!canUndoNow}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
            canUndoNow
              ? "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-zinc-700"
              : "text-slate-300 dark:text-zinc-600 cursor-not-allowed"
          )}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedoNow}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
            canRedoNow
              ? "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-zinc-700"
              : "text-slate-300 dark:text-zinc-600 cursor-not-allowed"
          )}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Links overview */}
      <button
        onClick={() => setLinkOverviewOpen(true)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-md transition-colors",
          "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
          "dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-zinc-700"
        )}
        title="Link overview"
      >
        <Link2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Links</span>
      </button>

      {/* Auto-number */}
      <button
        onClick={() => {
          if (window.confirm("Re-assign all category and node numbers sequentially?")) {
            renumberAll();
          }
        }}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-md transition-colors",
          "text-amber-500 hover:text-amber-600 hover:bg-amber-50",
          "dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/20"
        )}
        title="Auto-number all categories and nodes"
      >
        <Hash className="w-3.5 h-3.5" />
      </button>

      {/* Center — Workflow name */}
      <div className="flex-1 flex items-center justify-center min-w-0">
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
                "bg-white dark:bg-zinc-900 dark:text-slate-100",
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
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {metadata.name}
            </span>
            <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleNewWorkflow}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
            "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
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
              "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            )}
            title="Recent workflows"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Recent</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showRecent && (
            <div
              className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[220px]"
              onClick={(e) => e.stopPropagation()}
            >
              {recentList.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 text-center">
                  No recent saves
                </div>
              ) : (
                recentList.map((w) => (
                  <button
                    key={w.metadata.id}
                    onClick={() => handleLoadRecent(w)}
                    className="flex flex-col w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {w.metadata.name}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(w.metadata.updatedAt).toLocaleString()}
                    </span>
                  </button>
                ))
              )}
              <hr className="my-1 border-slate-100 dark:border-zinc-700" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickSave();
                  setRecentList(getRecentSaves());
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
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
            "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
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

        {/* Import / Merge */}
        <button
          onClick={() => importFileInputRef.current?.click()}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
            "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          )}
          title="Import & merge another workflow"
        >
          <GitMerge className="w-4 h-4" />
          <span className="hidden sm:inline">Import</span>
        </button>
        <input
          ref={importFileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />

        {/* Copy / Paste */}
        <button
          onClick={copySelectedNodes}
          disabled={selectedNodeIds.size === 0}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
            selectedNodeIds.size > 0
              ? "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-zinc-700"
              : "text-slate-300 dark:text-zinc-600 cursor-not-allowed"
          )}
          title="Copy selected nodes (Ctrl+C)"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={pasteNodes}
          disabled={!clipboardExists}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
            clipboardExists
              ? "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-zinc-700"
              : "text-slate-300 dark:text-zinc-600 cursor-not-allowed"
          )}
          title="Paste nodes (Ctrl+V)"
        >
          <Clipboard className="w-4 h-4" />
        </button>

        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
            "text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          )}
          title={currentFileName ? `Save to ${currentFileName}.json` : "Save workflow as JSON"}
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          onClick={handleSaveAs}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
            "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          )}
          title="Save as new file"
        >
          <SaveAll className="w-4 h-4" />
          <span className="hidden sm:inline">Save As</span>
        </button>

        <button
          onClick={handleClear}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
            "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
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

      <LinkOverviewModal
        isOpen={linkOverviewOpen}
        onClose={() => setLinkOverviewOpen(false)}
      />

      <ConfirmModal
        isOpen={importConfirmOpen}
        onClose={() => {
          setImportConfirmOpen(false);
          setPendingImportWorkflow(null);
        }}
        onConfirm={handleImportConfirm}
        title="Import & Merge Workflow"
        message={`Merge "${pendingImportWorkflow?.metadata?.name ?? "workflow"}" into the current workflow? Matching lanes and stages will be reused; new ones will be created automatically.`}
        confirmText="Merge"
      />
    </header>
  );
}
