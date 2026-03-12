import { useCallback, useMemo, useState, useEffect, type DragEvent } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { buildNodeTypes } from "../nodes/index.ts";
import SubStepEdge from "../edges/SubStepEdge.tsx";
import { EdgeContextMenu } from "./EdgeContextMenu.tsx";
import { generateAllVirtuals, isVirtualId } from "../../utils/virtualNodes.ts";
import type { WorkflowNode, WorkflowEdge } from "../../types/index.ts";

const SNAP_GRID: [number, number] = [16, 16];

const edgeTypes: EdgeTypes = {
  default: SubStepEdge,
  smoothstep: SubStepEdge,
};

export default function WorkflowCanvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const expandedEdgeIds = useWorkflowStore((s) => s.expandedEdgeIds);
  const storeOnNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const storeOnEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const selectEdge = useWorkflowStore((s) => s.selectEdge);
  const toggleEdgeExpand = useWorkflowStore((s) => s.toggleEdgeExpand);
  const registryVersion = useWorkflowStore((s) => s.registryVersion);

  const nodeTypes = useMemo(() => buildNodeTypes(), [registryVersion]);

  // Generate virtual nodes/edges for expanded edges
  const virtuals = useMemo(
    () => generateAllVirtuals(expandedEdgeIds, edges, nodes),
    [expandedEdgeIds, edges, nodes]
  );

  // Merge real + virtual nodes
  const allNodes = useMemo<WorkflowNode[]>(
    () => [...nodes, ...virtuals.nodes],
    [nodes, virtuals.nodes]
  );

  // Keep all real edges (expanded ones render as faint path) + add virtual sub-edges
  const allEdges = useMemo<WorkflowEdge[]>(
    () => [...edges, ...virtuals.edges],
    [edges, virtuals.edges]
  );

  // Filter out virtual node changes so they don't hit the store
  const onNodesChange: OnNodesChange<WorkflowNode> = useCallback(
    (changes) => {
      const realChanges = changes.filter((c) => {
        if ('id' in c) return !isVirtualId(c.id);
        return true;
      });
      if (realChanges.length > 0) {
        storeOnNodesChange(realChanges);
      }
    },
    [storeOnNodesChange]
  );

  // Filter out virtual edge changes
  const onEdgesChange: OnEdgesChange<WorkflowEdge> = useCallback(
    (changes) => {
      const realChanges = changes.filter((c) => {
        if ('id' in c) return !isVirtualId(c.id);
        return true;
      });
      if (realChanges.length > 0) {
        storeOnEdgesChange(realChanges);
      }
    },
    [storeOnEdgesChange]
  );

  // Edge context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    edgeId: string;
  } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenu]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("application/reactflow-type");
      if (!nodeType) return;

      const reactFlowBounds = (
        event.currentTarget as HTMLDivElement
      ).getBoundingClientRect();

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      addNode(nodeType, position);
    },
    [addNode]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      // Ignore clicks on virtual nodes
      if (isVirtualId(node.id)) return;
      selectNode(node.id);
    },
    [selectNode]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      // Ignore clicks on virtual edges
      if (isVirtualId(edge.id)) return;
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  const onEdgeDoubleClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      if (isVirtualId(edge.id)) return;
      const edgeData = edge.data as Record<string, unknown> | undefined;
      const subSteps = edgeData?.subSteps as unknown[] | undefined;
      if (subSteps && subSteps.length > 0) {
        toggleEdgeExpand(edge.id);
      }
    },
    [toggleEdgeExpand]
  );

  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => {
      if (isVirtualId(edge.id)) return;
      event.preventDefault();
      selectEdge(edge.id);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    [selectEdge]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
    setContextMenu(null);
  }, [selectNode, selectEdge]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={allNodes}
        edges={allEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid
        snapGrid={SNAP_GRID}
        fitView
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          interactionWidth: 20,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          zoomable
          pannable
          className="!bg-slate-100 !border-slate-300"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#a5b4fc"
        />
      </ReactFlow>

      {/* Edge context menu */}
      {contextMenu && (
        <EdgeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          edgeId={contextMenu.edgeId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
