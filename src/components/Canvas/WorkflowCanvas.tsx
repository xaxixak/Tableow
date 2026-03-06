import { useCallback, useMemo, type DragEvent } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import { buildNodeTypes } from "../nodes/index.ts";

const SNAP_GRID: [number, number] = [16, 16];

export default function WorkflowCanvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const selectEdge = useWorkflowStore((s) => s.selectEdge);
  const registryVersion = useWorkflowStore((s) => s.registryVersion);

  const nodeTypes = useMemo(() => buildNodeTypes(), [registryVersion]);

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
      selectNode(node.id);
    },
    [selectNode]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
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
          color="#cbd5e1"
        />
      </ReactFlow>
    </div>
  );
}
