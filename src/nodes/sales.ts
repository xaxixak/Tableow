import type { NodeDefinition } from "../types/index.ts";

export const salesOrderNode: NodeDefinition = {
  type: "sales-order",
  label: "Sales Order",
  category: "Sales",
  description: "Create a sales order",
  icon: "\uD83D\uDED2",
  inputs: [{ name: "quotation", type: "document", label: "Quotation" }],
  outputs: [{ name: "so", type: "document", label: "SO" }],
  configSchema: [
    {
      key: "customer",
      label: "Customer",
      type: "text",
      defaultValue: "",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      defaultValue: 0,
    },
  ],
  defaultConfig: { customer: "", amount: 0 },
  color: "bg-green-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "customer",
      label: "Customer",
      type: "text",
      defaultValue: "",
    },
    {
      key: "validDays",
      label: "Valid (days)",
      type: "number",
      defaultValue: 30,
    },
  ],
  defaultConfig: { customer: "", validDays: 30 },
  color: "bg-lime-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "address",
      label: "Delivery Address",
      type: "textarea",
      defaultValue: "",
    },
    {
      key: "carrier",
      label: "Carrier",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { address: "", carrier: "" },
  color: "bg-emerald-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "reason",
      label: "Return Reason",
      type: "text",
      defaultValue: "",
    },
    {
      key: "refundMethod",
      label: "Refund Method",
      type: "select",
      options: [
        { label: "Credit Note", value: "credit-note" },
        { label: "Cash Refund", value: "cash" },
        { label: "Replacement", value: "replacement" },
      ],
      defaultValue: "credit-note",
    },
  ],
  defaultConfig: { reason: "", refundMethod: "credit-note" },
  color: "bg-yellow-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "paymentTerms",
      label: "Payment Terms",
      type: "select",
      options: [
        { label: "Net 15", value: "net15" },
        { label: "Net 30", value: "net30" },
        { label: "Net 60", value: "net60" },
        { label: "COD", value: "cod" },
      ],
      defaultValue: "net30",
    },
  ],
  defaultConfig: { paymentTerms: "net30" },
  color: "bg-teal-600",
  flowType: "process",
  documentType: "sales-invoice",
};

export const salesNodes: NodeDefinition[] = [
  salesQuotationNode,
  salesOrderNode,
  deliveryNoteNode,
  salesInvoiceNode,
  salesReturnNode,
];
