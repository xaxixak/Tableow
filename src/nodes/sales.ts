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

export const salesOrderNode: NodeDefinition = {
  type: "sales-order",
  label: "Sales Order",
  category: "Sales",
  description: "Create a sales order",
  icon: "\uD83D\uDED2",
  inputs: [{ name: "quotation", type: "document", label: "Quotation" }],
  outputs: [{ name: "so", type: "document", label: "SO" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-green-600",
  flowType: "document",
  documentType: "sales-order",
};

export const salesQuotationNode: NodeDefinition = {
  type: "sales-quotation",
  label: "Quotation",
  category: "Sales",
  description: "Create a sales quotation for customer",
  icon: "\uD83D\uDCDD",
  inputs: [{ name: "inquiry", type: "document", label: "Inquiry" }],
  outputs: [{ name: "quotation", type: "document", label: "Quotation" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-lime-600",
  flowType: "document",
  documentType: "quotation",
};

export const deliveryNoteNode: NodeDefinition = {
  type: "delivery-note",
  label: "Delivery Note",
  category: "Sales",
  description: "Create delivery note for shipment",
  icon: "\uD83D\uDE9A",
  inputs: [{ name: "so", type: "document", label: "SO" }],
  outputs: [{ name: "dn", type: "document", label: "DN" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-emerald-600",
  flowType: "document",
  documentType: "delivery-note",
};

export const salesReturnNode: NodeDefinition = {
  type: "sales-return",
  label: "Sales Return",
  category: "Sales",
  description: "Process customer return",
  icon: "\uD83D\uDD04",
  inputs: [{ name: "dn", type: "document", label: "DN" }],
  outputs: [{ name: "return", type: "document", label: "Return" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-yellow-600",
  flowType: "document",
  documentType: "sales-return",
};

export const salesInvoiceNode: NodeDefinition = {
  type: "sales-invoice",
  label: "Sales Invoice",
  category: "Sales",
  description: "Generate sales invoice from delivery",
  icon: "\uD83E\uDDFE",
  inputs: [{ name: "dn", type: "document", label: "DN" }],
  outputs: [{ name: "invoice", type: "document", label: "Invoice" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-teal-600",
  flowType: "document",
  documentType: "sales-invoice",
};

export const salesNodes: NodeDefinition[] = [
  salesQuotationNode,
  salesOrderNode,
  deliveryNoteNode,
  salesInvoiceNode,
  salesReturnNode,
];
