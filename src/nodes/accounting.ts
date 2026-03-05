import type { NodeDefinition } from "../types/index.ts";

// --- AR (Accounts Receivable) ---

export const invoiceNode: NodeDefinition = {
  type: "invoice",
  label: "Invoice",
  category: "Accounting/AR",
  description: "Create or process a sales invoice",
  icon: "\uD83D\uDCCB",
  inputs: [{ name: "document", type: "document", label: "Document" }],
  outputs: [{ name: "invoice", type: "document", label: "Invoice" }],
  configSchema: [
    {
      key: "invoiceType",
      label: "Invoice Type",
      type: "select",
      options: [
        { label: "Sales", value: "sales" },
        { label: "Credit Note", value: "credit-note" },
      ],
      defaultValue: "sales",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      defaultValue: 0,
    },
  ],
  defaultConfig: { invoiceType: "sales", amount: 0 },
  color: "bg-blue-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "method",
      label: "Payment Method",
      type: "select",
      options: [
        { label: "Bank Transfer", value: "bank" },
        { label: "Cash", value: "cash" },
        { label: "Check", value: "check" },
      ],
      defaultValue: "bank",
    },
  ],
  defaultConfig: { method: "bank" },
  color: "bg-green-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "warehouse",
      label: "Warehouse",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { warehouse: "" },
  color: "bg-emerald-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "vendor",
      label: "Vendor",
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
  defaultConfig: { vendor: "", amount: 0 },
  color: "bg-orange-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "department",
      label: "Department",
      type: "text",
      defaultValue: "",
    },
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      defaultValue: "",
    },
    {
      key: "urgency",
      label: "Urgency",
      type: "select",
      options: [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
      ],
      defaultValue: "medium",
    },
  ],
  defaultConfig: { department: "", vendor: "", urgency: "medium" },
  color: "bg-amber-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "department",
      label: "Department",
      type: "text",
      defaultValue: "",
    },
    {
      key: "urgency",
      label: "Urgency",
      type: "select",
      options: [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
      ],
      defaultValue: "medium",
    },
  ],
  defaultConfig: { department: "", urgency: "medium" },
  color: "bg-yellow-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "method",
      label: "Payment Method",
      type: "select",
      options: [
        { label: "Bank Transfer", value: "bank" },
        { label: "Cash", value: "cash" },
        { label: "Check", value: "check" },
      ],
      defaultValue: "bank",
    },
  ],
  defaultConfig: { method: "bank" },
  color: "bg-indigo-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "approver",
      label: "Approver",
      type: "text",
      defaultValue: "",
    },
    {
      key: "threshold",
      label: "Threshold Amount",
      type: "number",
      defaultValue: 1000,
    },
  ],
  defaultConfig: { approver: "", threshold: 1000 },
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
  outputs: [],
  configSchema: [
    {
      key: "reportType",
      label: "Report Type",
      type: "select",
      options: [
        { label: "Cash Flow", value: "cashflow" },
        { label: "Profit & Loss", value: "profitloss" },
        { label: "Balance Sheet", value: "balance" },
      ],
      defaultValue: "cashflow",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      options: [
        { label: "PDF", value: "pdf" },
        { label: "Excel", value: "excel" },
      ],
      defaultValue: "pdf",
    },
  ],
  defaultConfig: { reportType: "cashflow", format: "pdf" },
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
  configSchema: [
    {
      key: "reason",
      label: "Reason",
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
  defaultConfig: { reason: "", amount: 0 },
  color: "bg-red-600",
  flowType: "process",
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
  configSchema: [
    {
      key: "reason",
      label: "Reason",
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
  defaultConfig: { reason: "", amount: 0 },
  color: "bg-pink-600",
  flowType: "process",
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
