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

function BaseNode({ data, type, selected }: NodeProps) {
  const registryVersion = useWorkflowStore((state) => state.registryVersion);

  const definition = useMemo(() => {
    return type ? nodeRegistry.get(type) : undefined;
  }, [type, registryVersion]);

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
        "min-w-[160px] rounded-lg shadow-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900",
        "transition-shadow duration-150",
        selected && "ring-2 ring-blue-500 shadow-lg"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg text-white text-sm font-medium"
        style={{ backgroundColor: catColor.hex }}
      >
        {icon && <span className="text-base leading-none">{icon}</span>}
        {definition?.number && <span className="text-[10px] font-normal opacity-70">{definition.number}</span>}
        <span className="truncate">{label}</span>
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
