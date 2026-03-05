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

export const stockTransferNode: NodeDefinition = {
  type: "stock-transfer",
  label: "Stock Transfer",
  category: "Inventory",
  description: "Transfer stock between warehouses",
  icon: "\uD83D\uDD00",
  inputs: [{ name: "request", type: "document", label: "Request" }],
  outputs: [{ name: "transfer", type: "document", label: "Transfer" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-violet-600",
  flowType: "document",
  documentType: "stock-transfer",
};

export const stockAdjustmentNode: NodeDefinition = {
  type: "stock-adjustment",
  label: "Stock Adjustment",
  category: "Inventory",
  description: "Adjust stock levels",
  icon: "\uD83D\uDCCA",
  inputs: [{ name: "count", type: "document", label: "Count" }],
  outputs: [{ name: "adjustment", type: "document", label: "Adjustment" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-fuchsia-600",
  flowType: "document",
  documentType: "stock-adjustment",
};

export const goodsIssueNode: NodeDefinition = {
  type: "goods-issue",
  label: "Goods Issue",
  category: "Inventory",
  description: "Issue goods from warehouse",
  icon: "\uD83D\uDCE4",
  inputs: [{ name: "request", type: "document", label: "Request" }],
  outputs: [{ name: "issue", type: "document", label: "Issue" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-rose-600",
  flowType: "document",
  documentType: "goods-issue",
};

export const stockCountNode: NodeDefinition = {
  type: "stock-count",
  label: "Stock Count",
  category: "Inventory",
  description: "Physical stock count / cycle count",
  icon: "\uD83D\uDD22",
  inputs: [],
  outputs: [{ name: "count", type: "document", label: "Count" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-purple-600",
  flowType: "start",
  documentType: "stock-count",
};

export const inventoryNodes: NodeDefinition[] = [
  stockTransferNode,
  stockAdjustmentNode,
  goodsIssueNode,
  stockCountNode,
];
