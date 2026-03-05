import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import Toolbar from "./components/Palette/Toolbar.tsx";
import NodePalette from "./components/Palette/NodePalette.tsx";
import PropertiesPanel from "./components/Properties/PropertiesPanel.tsx";
import WorkflowCanvas from "./components/Canvas/WorkflowCanvas.tsx";
import GridView from "./components/Grid/GridView.tsx";
import { useWorkflowStore } from "./store/workflowStore.ts";
import { registerAllNodes } from "./nodes/index.ts";
import "./App.css";

// Register node definitions before React renders so the palette is populated on first render
registerAllNodes();

export default function App() {
  const viewMode = useWorkflowStore((s) => s.viewMode);
  const darkMode = useWorkflowStore((s) => s.darkMode);

  // Apply dark mode class on mount and when it changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* Top toolbar */}
        <Toolbar />

        {/* Main content area */}
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar - Node Palette */}
          <NodePalette />

          {/* Center - Grid or Canvas */}
          <main className="flex-1 min-w-0">
            {viewMode === "grid" ? <GridView /> : <WorkflowCanvas />}
          </main>

          {/* Right sidebar - Properties */}
          <PropertiesPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
