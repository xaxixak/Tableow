import { useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { nodeRegistry } from "../../registry/index.ts";
import { useWorkflowStore } from "../../store/workflowStore.ts";
import type { PortDefinition } from "../../types/index.ts";
import { cn } from "../../lib/utils.ts";
import { getColorByIndex } from "../../lib/categoryColors.ts";

const HANDLE_COLORS: Record<string, string> = {
  document: "bg-blue-500 border-blue-600",
  number: "bg-green-500 border-green-600",
  string: "bg-yellow-400 border-yellow-500",
  boolean: "bg-red-500 border-red-600",
  any: "bg-gray-400 border-gray-500",
};

function getHandleColor(type: string): string {
  return HANDLE_COLORS[type] ?? HANDLE_COLORS.any;
}

function getHandleTop(index: number, total: number): string {
  if (total === 1) return "50%";
  const padding = 20;
  const available = 100 - padding * 2;
  const offset = padding + (available / (total - 1)) * index;
  return `${offset}%`;
}

function BaseNode({ id, data, type, selected }: NodeProps) {
  const registryVersion = useWorkflowStore((state) => state.registryVersion);
  const gridConfig = useWorkflowStore((state) => state.gridConfig);

  const definition = useMemo(() => {
    return type ? nodeRegistry.get(type) : undefined;
  }, [type, registryVersion]);

  // Check if node is effectively placed in a visible grid cell
  const isUnplaced = useMemo(() => {
    const { placements, lanes, stages } = gridConfig;
    const placement = placements.find((p) => p.nodeId === id);
    if (!placement) return true;

    // Check placement points to existing lane and stage
    const laneExists = lanes.some((l) => l.id === placement.laneId);
    const stageExists = stages.some((s) => s.id === placement.stageId);
    if (!laneExists || !stageExists) return true;

    // Check placement points to a leaf stage (non-leaf stages have no grid cell)
    const stageHasChildren = stages.some((s) => s.parentId === placement.stageId);
    if (stageHasChildren) return true;

    // Check placement points to a leaf lane
    const laneHasChildren = lanes.some((l) => l.parentId === placement.laneId);
    if (laneHasChildren) return true;

    return false;
  }, [gridConfig, id]);

  const inputs: PortDefinition[] = definition?.inputs ?? [];
  const outputs: PortDefinition[] = definition?.outputs ?? [];
  const label = (data.label as string) ?? definition?.label ?? type ?? "Node";
  const icon = definition?.icon;
  const category = definition?.category ?? "processing";
  const customCategories = useWorkflowStore((state) => state.customCategories);
  const catDef = customCategories.find((c) => c.path === category);
  const catColor = getColorByIndex(catDef?.colorIndex);

  return (
    <div
      className={cn(
        "min-w-[160px] rounded-lg shadow-md bg-white dark:bg-zinc-900",
        "transition-shadow duration-150",
        isUnplaced
          ? "border-2 border-dashed border-orange-400 dark:border-orange-500 ring-1 ring-orange-200 dark:ring-orange-800"
          : "border border-slate-300 dark:border-zinc-700",
        selected && "ring-2 ring-blue-500 shadow-lg"
      )}
    >
      {/* Unplaced badge bar */}
      {isUnplaced && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-t-[6px] bg-orange-100 dark:bg-orange-950/60 border-b border-dashed border-orange-300 dark:border-orange-700">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white uppercase tracking-wider">Canvas Only</span>
          <span className="text-[9px] text-orange-500 dark:text-orange-400">Not in grid</span>
        </div>
      )}

      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm font-medium",
          isUnplaced
            ? "bg-orange-50 dark:bg-orange-950/40"
            : "rounded-t-lg text-white",
        )}
        style={isUnplaced ? undefined : { backgroundColor: catColor.hex }}
      >
        {icon && <span className="text-base leading-none">{icon}</span>}
        {definition?.number && (
          <span className={cn(
            "text-[10px] font-normal",
            isUnplaced ? "text-orange-400 dark:text-orange-500" : "opacity-70"
          )}>
            {definition.number}
          </span>
        )}
        <span className={cn(
          "truncate",
          isUnplaced && "text-orange-700 dark:text-orange-400"
        )}>
          {label}
        </span>
      </div>

      {/* Body */}
      <div className="relative px-3 py-3 min-h-[40px]">
        {/* Input handles */}
        {inputs.map((port, i) => (
          <Handle
            key={`input-${port.name}`}
            type="target"
            position={Position.Left}
            id={port.name}
            title={`${port.label ?? port.name} (${port.type})`}
            style={{ top: getHandleTop(i, inputs.length) }}
            className={cn(
              "!w-3 !h-3 !border-2 !rounded-full",
              getHandleColor(port.type)
            )}
          />
        ))}

        {/* Port labels */}
        <div className="flex justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col gap-1">
            {inputs.map((port) => (
              <span key={`label-in-${port.name}`}>
                {port.label ?? port.name}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1 items-end">
            {outputs.map((port) => (
              <span key={`label-out-${port.name}`}>
                {port.label ?? port.name}
              </span>
            ))}
          </div>
        </div>

        {/* Output handles */}
        {outputs.map((port, i) => (
          <Handle
            key={`output-${port.name}`}
            type="source"
            position={Position.Right}
            id={port.name}
            title={`${port.label ?? port.name} (${port.type})`}
            style={{ top: getHandleTop(i, outputs.length) }}
            className={cn(
              "!w-3 !h-3 !border-2 !rounded-full",
              getHandleColor(port.type)
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default BaseNode;
