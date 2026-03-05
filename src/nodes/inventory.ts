import type { NodeDefinition } from "../types/index.ts";

export const stockTransferNode: NodeDefinition = {
  type: "stock-transfer",
  label: "Stock Transfer",
  category: "Inventory",
  description: "Transfer stock between warehouses",
  icon: "\uD83D\uDD00",
  inputs: [{ name: "request", type: "document", label: "Request" }],
  outputs: [{ name: "transfer", type: "document", label: "Transfer" }],
  configSchema: [
    {
      key: "fromWarehouse",
      label: "From Warehouse",
      type: "text",
      defaultValue: "",
    },
    {
      key: "toWarehouse",
      label: "To Warehouse",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { fromWarehouse: "", toWarehouse: "" },
  color: "bg-violet-600",
};

export const stockAdjustmentNode: NodeDefinition = {
  type: "stock-adjustment",
  label: "Stock Adjustment",
  category: "Inventory",
  description: "Adjust stock levels",
  icon: "\uD83D\uDCCA",
  inputs: [{ name: "count", type: "document", label: "Count" }],
  outputs: [{ name: "adjustment", type: "document", label: "Adjustment" }],
  configSchema: [
    {
      key: "adjustmentType",
      label: "Adjustment Type",
      type: "select",
      options: [
        { label: "Increase", value: "increase" },
        { label: "Decrease", value: "decrease" },
        { label: "Write-off", value: "writeoff" },
      ],
      defaultValue: "increase",
    },
    {
      key: "reason",
      label: "Reason",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { adjustmentType: "increase", reason: "" },
  color: "bg-fuchsia-600",
};

export const goodsIssueNode: NodeDefinition = {
  type: "goods-issue",
  label: "Goods Issue",
  category: "Inventory",
  description: "Issue goods from warehouse",
  icon: "\uD83D\uDCE4",
  inputs: [{ name: "request", type: "document", label: "Request" }],
  outputs: [{ name: "issue", type: "document", label: "Issue" }],
  configSchema: [
    {
      key: "warehouse",
      label: "Warehouse",
      type: "text",
      defaultValue: "",
    },
    {
      key: "purpose",
      label: "Purpose",
      type: "select",
      options: [
        { label: "Production", value: "production" },
        { label: "Sales", value: "sales" },
        { label: "Internal Use", value: "internal" },
      ],
      defaultValue: "sales",
    },
  ],
  defaultConfig: { warehouse: "", purpose: "sales" },
  color: "bg-rose-600",
};

export const stockCountNode: NodeDefinition = {
  type: "stock-count",
  label: "Stock Count",
  category: "Inventory",
  description: "Physical stock count / cycle count",
  icon: "\uD83D\uDD22",
  inputs: [],
  outputs: [{ name: "count", type: "document", label: "Count" }],
  configSchema: [
    {
      key: "warehouse",
      label: "Warehouse",
      type: "text",
      defaultValue: "",
    },
    {
      key: "countType",
      label: "Count Type",
      type: "select",
      options: [
        { label: "Full Count", value: "full" },
        { label: "Cycle Count", value: "cycle" },
        { label: "Spot Check", value: "spot" },
      ],
      defaultValue: "full",
    },
  ],
  defaultConfig: { warehouse: "", countType: "full" },
  color: "bg-purple-600",
};

export const inventoryNodes: NodeDefinition[] = [
  stockTransferNode,
  stockAdjustmentNode,
  goodsIssueNode,
  stockCountNode,
];
