import type { NodeDefinition } from "../types/index.ts";

export const startNode: NodeDefinition = {
  type: "start",
  label: "Start",
  category: "General",
  description: "Entry point of the workflow",
  icon: "\u25B6",
  inputs: [],
  outputs: [{ name: "flow", type: "flow", label: "Out" }],
  color: "bg-emerald-600",
  flowType: "start",
};

export const processNode: NodeDefinition = {
  type: "process",
  label: "Process",
  category: "General",
  description: "A generic processing step",
  icon: "\u2699",
  inputs: [{ name: "flow", type: "flow", label: "In" }],
  outputs: [{ name: "flow", type: "flow", label: "Out" }],
  configSchema: [
    {
      key: "description",
      label: "Description",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { description: "" },
  color: "bg-violet-600",
  flowType: "process",
};

export const decisionNode: NodeDefinition = {
  type: "decision",
  label: "Decision",
  category: "General",
  description: "Branch based on a condition",
  icon: "\u2666",
  inputs: [{ name: "flow", type: "flow", label: "In" }],
  outputs: [
    { name: "yes", type: "flow", label: "Yes" },
    { name: "no", type: "flow", label: "No" },
  ],
  configSchema: [
    {
      key: "condition",
      label: "Condition",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { condition: "" },
  color: "bg-sky-600",
  flowType: "decision",
};

export const outputNode: NodeDefinition = {
  type: "output",
  label: "Output",
  category: "General",
  description: "End point that produces output",
  icon: "\u2B24",
  inputs: [{ name: "flow", type: "flow", label: "In" }],
  outputs: [],
  configSchema: [
    {
      key: "outputType",
      label: "Output Type",
      type: "select",
      options: [
        { label: "Log", value: "log" },
        { label: "File", value: "file" },
        { label: "API", value: "api" },
      ],
      defaultValue: "log",
    },
  ],
  defaultConfig: { outputType: "log" },
  color: "bg-amber-600",
  flowType: "output",
};

export const noteNode: NodeDefinition = {
  type: "note",
  label: "Note",
  category: "General",
  description: "A sticky note for comments",
  icon: "\uD83D\uDCDD",
  inputs: [],
  outputs: [],
  configSchema: [
    {
      key: "text",
      label: "Note Text",
      type: "textarea",
      defaultValue: "",
    },
  ],
  defaultConfig: { text: "" },
  color: "bg-yellow-500",
  flowType: "process",
};

export const genericNodes: NodeDefinition[] = [
  startNode,
  processNode,
  decisionNode,
  outputNode,
  noteNode,
];
