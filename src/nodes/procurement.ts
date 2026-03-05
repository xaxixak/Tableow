import type { NodeDefinition } from "../types/index.ts";

export const purchaseOrderNode: NodeDefinition = {
  type: "purchase-order",
  label: "Purchase Order",
  category: "Procurement",
  description: "Create purchase order for vendor",
  icon: "\uD83D\uDCE6",
  inputs: [{ name: "pr", type: "document", label: "PR" }],
  outputs: [{ name: "po", type: "document", label: "PO" }],
  configSchema: [
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      defaultValue: "",
    },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: [
        { label: "THB", value: "THB" },
        { label: "USD", value: "USD" },
        { label: "EUR", value: "EUR" },
      ],
      defaultValue: "THB",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      defaultValue: 0,
    },
  ],
  defaultConfig: { vendor: "", currency: "THB", amount: 0 },
  color: "bg-blue-700",
  flowType: "process",
  documentType: "purchase-order",
};

export const goodsReceiptNoteNode: NodeDefinition = {
  type: "goods-receipt-note",
  label: "Goods Receipt Note",
  category: "Procurement",
  description: "Record goods received from vendor",
  icon: "\uD83D\uDCE5",
  inputs: [{ name: "po", type: "document", label: "PO" }],
  outputs: [{ name: "grn", type: "document", label: "GRN" }],
  configSchema: [
    {
      key: "warehouse",
      label: "Warehouse",
      type: "text",
      defaultValue: "",
    },
    {
      key: "inspected",
      label: "Quality Inspected",
      type: "boolean",
      defaultValue: false,
    },
  ],
  defaultConfig: { warehouse: "", inspected: false },
  color: "bg-cyan-600",
  flowType: "process",
  documentType: "goods-receipt-note",
};

export const vendorQuotationNode: NodeDefinition = {
  type: "vendor-quotation",
  label: "Vendor Quotation",
  category: "Procurement",
  description: "Record vendor quotation",
  icon: "\uD83D\uDCC3",
  inputs: [{ name: "rfq", type: "document", label: "RFQ" }],
  outputs: [{ name: "quotation", type: "document", label: "Quotation" }],
  configSchema: [
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      defaultValue: "",
    },
    {
      key: "validUntil",
      label: "Valid Until",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { vendor: "", validUntil: "" },
  color: "bg-teal-600",
  flowType: "process",
  documentType: "vendor-quotation",
};

export const requestForQuotationNode: NodeDefinition = {
  type: "request-for-quotation",
  label: "Request for Quotation",
  category: "Procurement",
  description: "Send RFQ to vendors",
  icon: "\uD83D\uDD0D",
  inputs: [{ name: "pr", type: "document", label: "PR" }],
  outputs: [{ name: "rfq", type: "document", label: "RFQ" }],
  configSchema: [
    {
      key: "vendors",
      label: "Vendor List",
      type: "textarea",
      defaultValue: "",
    },
    {
      key: "deadline",
      label: "Response Deadline",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { vendors: "", deadline: "" },
  color: "bg-sky-600",
  flowType: "process",
  documentType: "request-for-quotation",
};

export const goodsReturnNode: NodeDefinition = {
  type: "goods-return",
  label: "Goods Return",
  category: "Procurement",
  description: "Return goods to vendor",
  icon: "\uD83D\uDD04",
  inputs: [{ name: "grn", type: "document", label: "GRN" }],
  outputs: [{ name: "return", type: "document", label: "Return" }],
  configSchema: [
    {
      key: "reason",
      label: "Return Reason",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { reason: "" },
  color: "bg-orange-600",
  flowType: "process",
  documentType: "goods-return",
};

export const procurementNodes: NodeDefinition[] = [
  purchaseOrderNode,
  goodsReceiptNoteNode,
  vendorQuotationNode,
  requestForQuotationNode,
  goodsReturnNode,
];
