import type { NodeDefinition } from "../types/index.ts";

export const journalEntryNode: NodeDefinition = {
  type: "journal-entry",
  label: "Journal Entry",
  category: "Finance",
  description: "Create manual journal entry",
  icon: "\uD83D\uDCD3",
  inputs: [{ name: "document", type: "document", label: "Document" }],
  outputs: [{ name: "entry", type: "document", label: "Entry" }],
  configSchema: [
    {
      key: "entryType",
      label: "Entry Type",
      type: "select",
      options: [
        { label: "Standard", value: "standard" },
        { label: "Adjusting", value: "adjusting" },
        { label: "Closing", value: "closing" },
        { label: "Reversing", value: "reversing" },
      ],
      defaultValue: "standard",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      defaultValue: 0,
    },
  ],
  defaultConfig: { entryType: "standard", amount: 0 },
  color: "bg-slate-700",
};

export const budgetRequestNode: NodeDefinition = {
  type: "budget-request",
  label: "Budget Request",
  category: "Finance",
  description: "Submit budget allocation request",
  icon: "\uD83D\uDCB5",
  inputs: [],
  outputs: [
    { name: "approved", type: "document", label: "Approved" },
    { name: "rejected", type: "document", label: "Rejected" },
  ],
  configSchema: [
    {
      key: "department",
      label: "Department",
      type: "text",
      defaultValue: "",
    },
    {
      key: "amount",
      label: "Budget Amount",
      type: "number",
      defaultValue: 0,
    },
    {
      key: "period",
      label: "Period",
      type: "select",
      options: [
        { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
        { label: "Annual", value: "annual" },
      ],
      defaultValue: "monthly",
    },
  ],
  defaultConfig: { department: "", amount: 0, period: "monthly" },
  color: "bg-green-700",
};

export const bankReconciliationNode: NodeDefinition = {
  type: "bank-reconciliation",
  label: "Bank Reconciliation",
  category: "Finance",
  description: "Reconcile bank statement with records",
  icon: "\uD83C\uDFE6",
  inputs: [{ name: "statement", type: "document", label: "Statement" }],
  outputs: [{ name: "reconciled", type: "document", label: "Reconciled" }],
  configSchema: [
    {
      key: "bankAccount",
      label: "Bank Account",
      type: "text",
      defaultValue: "",
    },
    {
      key: "period",
      label: "Period",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { bankAccount: "", period: "" },
  color: "bg-blue-800",
};

export const taxFilingNode: NodeDefinition = {
  type: "tax-filing",
  label: "Tax Filing",
  category: "Finance",
  description: "Prepare and file tax documents",
  icon: "\uD83C\uDFDB\uFE0F",
  inputs: [{ name: "data", type: "document", label: "Data" }],
  outputs: [{ name: "filing", type: "document", label: "Filing" }],
  configSchema: [
    {
      key: "taxType",
      label: "Tax Type",
      type: "select",
      options: [
        { label: "VAT", value: "vat" },
        { label: "WHT", value: "wht" },
        { label: "Corporate Income Tax", value: "cit" },
        { label: "Personal Income Tax", value: "pit" },
      ],
      defaultValue: "vat",
    },
    {
      key: "period",
      label: "Tax Period",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { taxType: "vat", period: "" },
  color: "bg-red-700",
};

export const assetRegisterNode: NodeDefinition = {
  type: "asset-register",
  label: "Asset Register",
  category: "Finance",
  description: "Register or dispose fixed asset",
  icon: "\uD83C\uDFE2",
  inputs: [{ name: "document", type: "document", label: "Document" }],
  outputs: [{ name: "asset", type: "document", label: "Asset" }],
  configSchema: [
    {
      key: "action",
      label: "Action",
      type: "select",
      options: [
        { label: "Register", value: "register" },
        { label: "Depreciate", value: "depreciate" },
        { label: "Dispose", value: "dispose" },
        { label: "Transfer", value: "transfer" },
      ],
      defaultValue: "register",
    },
    {
      key: "value",
      label: "Asset Value",
      type: "number",
      defaultValue: 0,
    },
  ],
  defaultConfig: { action: "register", value: 0 },
  color: "bg-zinc-700",
};

export const financeNodes: NodeDefinition[] = [
  journalEntryNode,
  budgetRequestNode,
  bankReconciliationNode,
  taxFilingNode,
  assetRegisterNode,
];
