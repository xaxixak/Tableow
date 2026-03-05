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

// --- AR (Accounts Receivable) ---

export const invoiceNode: NodeDefinition = {
  type: "invoice",
  label: "Invoice",
  category: "Accounting/AR",
  description: "Create or process a sales invoice",
  icon: "\uD83D\uDCCB",
  inputs: [{ name: "document", type: "document", label: "Document" }],
  outputs: [{ name: "invoice", type: "document", label: "Invoice" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-blue-600",
  flowType: "document",
  documentType: "invoice",
};

export const receiptNode: NodeDefinition = {
  type: "receipt",
  label: "Receipt",
  category: "Accounting/AR",
  description: "Generate customer payment receipt",
  icon: "\uD83D\uDCE8",
  inputs: [{ name: "payment", type: "document", label: "Payment" }],
  outputs: [{ name: "receipt", type: "document", label: "Receipt" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-green-600",
  flowType: "document",
  documentType: "receipt",
};

export const goodsReceiptNode: NodeDefinition = {
  type: "goods-receipt",
  label: "Goods Receipt",
  category: "Accounting/AR",
  description: "Record goods receipt from customer",
  icon: "\uD83D\uDCE6",
  inputs: [{ name: "order", type: "document", label: "Order" }],
  outputs: [{ name: "receipt", type: "document", label: "GR" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-emerald-600",
  flowType: "document",
  documentType: "goods-receipt",
};

// --- AP (Accounts Payable) ---

export const billNode: NodeDefinition = {
  type: "bill",
  label: "Bill",
  category: "Accounting/AP",
  description: "Vendor bill processing",
  icon: "\uD83E\uDDFE",
  inputs: [{ name: "document", type: "document", label: "Document" }],
  outputs: [{ name: "bill", type: "document", label: "Bill" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-orange-600",
  flowType: "document",
  documentType: "bill",
};

export const purchaseRequestBillNode: NodeDefinition = {
  type: "purchase-request-bill",
  label: "PR (Bill)",
  category: "Accounting/AP",
  description: "Purchase request that generates a vendor bill",
  icon: "\uD83D\uDCDD",
  inputs: [{ name: "requisition", type: "document", label: "Requisition" }],
  outputs: [
    { name: "pr", type: "document", label: "PR" },
    { name: "bill", type: "document", label: "Bill" },
  ],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-amber-600",
  flowType: "document",
  documentType: "purchase-request",
};

export const purchaseRequestNoBillNode: NodeDefinition = {
  type: "purchase-request-no-bill",
  label: "PR (No Bill)",
  category: "Accounting/AP",
  description: "Purchase request without billing (petty cash, services)",
  icon: "\uD83D\uDCCB",
  inputs: [{ name: "requisition", type: "document", label: "Requisition" }],
  outputs: [{ name: "pr", type: "document", label: "PR" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-yellow-600",
  flowType: "document",
  documentType: "purchase-request",
};

export const paymentVoucherNode: NodeDefinition = {
  type: "payment-voucher",
  label: "Payment Voucher",
  category: "Accounting/AP",
  description: "Generate a payment voucher",
  icon: "\uD83D\uDCB3",
  inputs: [{ name: "bill", type: "document", label: "Bill" }],
  outputs: [{ name: "payment", type: "document", label: "Payment" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-indigo-600",
  flowType: "document",
  documentType: "payment-voucher",
};

// --- General Accounting ---

export const approvalNode: NodeDefinition = {
  type: "approval",
  label: "Approval",
  category: "Accounting",
  description: "Route document for approval",
  icon: "\u2705",
  inputs: [{ name: "document", type: "document", label: "Document" }],
  outputs: [
    { name: "approved", type: "document", label: "Approved" },
    { name: "rejected", type: "document", label: "Rejected" },
  ],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-teal-600",
  flowType: "decision",
  documentType: "approval",
};

export const reportNode: NodeDefinition = {
  type: "report",
  label: "Report",
  category: "Accounting",
  description: "Generate a financial report",
  icon: "\uD83D\uDCCA",
  inputs: [{ name: "data", type: "document", label: "Data" }],
  outputs: [{ name: "report", type: "document", label: "Report" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-rose-600",
  flowType: "output",
  documentType: "report",
};

export const debitNoteNode: NodeDefinition = {
  type: "debit-note",
  label: "Debit Note",
  category: "Accounting/AR",
  description: "Issue debit note to customer",
  icon: "\uD83D\uDCC4",
  inputs: [{ name: "invoice", type: "document", label: "Invoice" }],
  outputs: [{ name: "debitNote", type: "document", label: "Debit Note" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-red-600",
  flowType: "document",
  documentType: "debit-note",
};

export const creditNoteNode: NodeDefinition = {
  type: "credit-note",
  label: "Credit Note",
  category: "Accounting/AR",
  description: "Issue credit note to customer",
  icon: "\uD83D\uDCB8",
  inputs: [{ name: "invoice", type: "document", label: "Invoice" }],
  outputs: [{ name: "creditNote", type: "document", label: "Credit Note" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-pink-600",
  flowType: "document",
  documentType: "credit-note",
};

export const accountingNodes: NodeDefinition[] = [
  // AR
  invoiceNode,
  receiptNode,
  goodsReceiptNode,
  debitNoteNode,
  creditNoteNode,
  // AP
  billNode,
  purchaseRequestBillNode,
  purchaseRequestNoBillNode,
  paymentVoucherNode,
  // General
  approvalNode,
  reportNode,
];
