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

export const purchaseOrderNode: NodeDefinition = {
  type: "purchase-order",
  label: "Purchase Order",
  category: "Procurement",
  description: "Create purchase order for vendor",
  icon: "\uD83D\uDCE6",
  inputs: [{ name: "pr", type: "document", label: "PR" }],
  outputs: [{ name: "po", type: "document", label: "PO" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-blue-700",
  flowType: "document",
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
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-cyan-600",
  flowType: "document",
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
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-teal-600",
  flowType: "document",
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
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-sky-600",
  flowType: "document",
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
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-orange-600",
  flowType: "document",
  documentType: "goods-return",
};

export const procurementNodes: NodeDefinition[] = [
  purchaseOrderNode,
  goodsReceiptNoteNode,
  vendorQuotationNode,
  requestForQuotationNode,
  goodsReturnNode,
];
