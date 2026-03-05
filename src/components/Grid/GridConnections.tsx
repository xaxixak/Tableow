import { memo, useRef, useState, useCallback, useEffect } from "react";
import { useWorkflowStore } from "../../store/workflowStore.ts";

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

function GridConnections() {
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const selectedEdgeId = useWorkflowStore((s) => s.selectedEdgeId);
  const selectEdge = useWorkflowStore((s) => s.selectEdge);

  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const measurePositions = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const container = svgEl.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    setDimensions({
      width: container.scrollWidth,
      height: container.scrollHeight,
    });

    const newPositions = new Map<string, NodePosition>();

    for (const node of nodes) {
      const el = container.querySelector(`[data-node-id="${node.id}"]`);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      newPositions.set(node.id, {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      });
    }

    setPositions(newPositions);
  }, [nodes]);

  // Re-measure when nodes or edges change
  useEffect(() => {
    // Small delay to let DOM settle after React render
    const timer = setTimeout(measurePositions, 50);
    return () => clearTimeout(timer);
  }, [measurePositions, nodes.length, edges.length]);

  // Also re-measure on resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      measurePositions();
    });

    const container = svgRef.current?.parentElement;
    if (container) {
      observer.observe(container);
    }

    return () => observer.disconnect();
  }, [measurePositions]);

  if (edges.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-10"
      width={dimensions.width || "100%"}
      height={dimensions.height || "100%"}
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id="grid-arrow"
          viewBox="0 0 10 7"
          refX="9"
          refY="3.5"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#64748b" />
        </marker>
        <marker
          id="grid-arrow-selected"
          viewBox="0 0 10 7"
          refX="9"
          refY="3.5"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#3b82f6" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const sourcePos = positions.get(edge.source);
        const targetPos = positions.get(edge.target);

        if (!sourcePos || !targetPos) return null;

        const isSelected = selectedEdgeId === edge.id;
        const edgeLabel = edge.data?.label || edge.data?.number || "";

        // Source: right edge center
        const sx = sourcePos.x + sourcePos.width;
        const sy = sourcePos.y + sourcePos.height / 2;

        // Target: left edge center
        const tx = targetPos.x;
        const ty = targetPos.y + targetPos.height / 2;

        // Step line path (horizontal-vertical-horizontal)
        const midX = sx + (tx - sx) / 2;

        const pathD =
          Math.abs(sy - ty) < 2
            ? // Straight horizontal line
              `M ${sx} ${sy} L ${tx} ${ty}`
            : // Step line
              `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;

        // Label position: center of path
        const labelX = midX;
        const labelY = sy + (ty - sy) / 2;

        return (
          <g key={edge.id}>
            {/* Invisible wider path for easier clicking */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              style={{ cursor: "pointer", pointerEvents: "all" }}
              onClick={() => selectEdge(edge.id)}
            />
            {/* Visible path */}
            <path
              d={pathD}
              fill="none"
              stroke={isSelected ? "#3b82f6" : "#64748b"}
              strokeWidth={isSelected ? 3 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={isSelected ? "url(#grid-arrow-selected)" : "url(#grid-arrow)"}
              style={{ cursor: "pointer", pointerEvents: "all" }}
              onClick={() => selectEdge(edge.id)}
            />
            {/* Edge label */}
            {edgeLabel && (
              <text
                x={labelX}
                y={labelY - 8}
                textAnchor="middle"
                fontSize="11"
                fill={isSelected ? "#3b82f6" : "#64748b"}
                fontWeight={isSelected ? "600" : "normal"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {edgeLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default memo(GridConnections);
