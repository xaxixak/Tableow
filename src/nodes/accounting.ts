import type { NodeDefinition } from "../types/index.ts";

export const invoiceNode: NodeDefinition = {
  type: "invoice",
  label: "Invoice",
  category: "Accounting",
  description: "Create or process an invoice",
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
        { label: "Purchase", value: "purchase" },
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
};

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
};

export const paymentVoucherNode: NodeDefinition = {
  type: "payment-voucher",
  label: "Payment Voucher",
  category: "Accounting",
  description: "Generate a payment voucher",
  icon: "\uD83D\uDCB3",
  inputs: [{ name: "invoice", type: "document", label: "Invoice" }],
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
};

export const accountingNodes: NodeDefinition[] = [
  invoiceNode,
  approvalNode,
  paymentVoucherNode,
  reportNode,
];
