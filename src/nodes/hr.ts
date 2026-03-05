import type { NodeDefinition, ConfigFieldDefinition } from "../types/index.ts";

// Standard document config schema for all document nodes
const standardDocumentConfig: ConfigFieldDefinition[] = [
  {
    key: "documentNumber",
    label: "Document Number",
    type: "text",
    defaultValue: "",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Completed", value: "completed" },
    ],
    defaultValue: "draft",
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    defaultValue: "",
  },
  {
    key: "reference",
    label: "Reference",
    type: "text",
    defaultValue: "",
  },
];

export const leaveRequestNode: NodeDefinition = {
  type: "leave-request",
  label: "Leave Request",
  category: "HR",
  description: "Submit employee leave request",
  icon: "\uD83C\uDFD6\uFE0F",
  inputs: [],
  outputs: [
    { name: "approved", type: "document", label: "Approved" },
    { name: "rejected", type: "document", label: "Rejected" },
  ],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-green-600",
  flowType: "decision",
  documentType: "leave-request",
};

export const expenseClaimNode: NodeDefinition = {
  type: "expense-claim",
  label: "Expense Claim",
  category: "HR",
  description: "Submit employee expense claim",
  icon: "\uD83D\uDCB0",
  inputs: [],
  outputs: [{ name: "claim", type: "document", label: "Claim" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-amber-600",
  flowType: "start",
  documentType: "expense-claim",
};

export const timesheetNode: NodeDefinition = {
  type: "timesheet",
  label: "Timesheet",
  category: "HR",
  description: "Employee timesheet entry",
  icon: "\u23F0",
  inputs: [],
  outputs: [{ name: "timesheet", type: "document", label: "Timesheet" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-sky-600",
  flowType: "start",
  documentType: "timesheet",
};

export const travelRequestNode: NodeDefinition = {
  type: "travel-request",
  label: "Travel Request",
  category: "HR",
  description: "Submit business travel request",
  icon: "\u2708\uFE0F",
  inputs: [],
  outputs: [
    { name: "approved", type: "document", label: "Approved" },
    { name: "rejected", type: "document", label: "Rejected" },
  ],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-indigo-600",
  flowType: "decision",
  documentType: "travel-request",
};

export const overtimeRequestNode: NodeDefinition = {
  type: "overtime-request",
  label: "Overtime Request",
  category: "HR",
  description: "Submit overtime work request",
  icon: "\uD83C\uDF19",
  inputs: [],
  outputs: [
    { name: "approved", type: "document", label: "Approved" },
    { name: "rejected", type: "document", label: "Rejected" },
  ],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-violet-600",
  flowType: "decision",
  documentType: "overtime-request",
};

export const hrNodes: NodeDefinition[] = [
  leaveRequestNode,
  expenseClaimNode,
  timesheetNode,
  travelRequestNode,
  overtimeRequestNode,
];
