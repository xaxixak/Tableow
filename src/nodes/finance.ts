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

export const journalEntryNode: NodeDefinition = {
  type: "journal-entry",
  label: "Journal Entry",
  category: "Finance",
  description: "Create manual journal entry",
  icon: "\uD83D\uDCD3",
  inputs: [{ name: "document", type: "document", label: "Document" }],
  outputs: [{ name: "entry", type: "document", label: "Entry" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-slate-700",
  flowType: "document",
  documentType: "journal-entry",
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
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-green-700",
  flowType: "decision",
  documentType: "budget-request",
};

export const bankReconciliationNode: NodeDefinition = {
  type: "bank-reconciliation",
  label: "Bank Reconciliation",
  category: "Finance",
  description: "Reconcile bank statement with records",
  icon: "\uD83C\uDFE6",
  inputs: [{ name: "statement", type: "document", label: "Statement" }],
  outputs: [{ name: "reconciled", type: "document", label: "Reconciled" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-blue-800",
  flowType: "document",
  documentType: "bank-reconciliation",
};

export const taxFilingNode: NodeDefinition = {
  type: "tax-filing",
  label: "Tax Filing",
  category: "Finance",
  description: "Prepare and file tax documents",
  icon: "\uD83C\uDFDB\uFE0F",
  inputs: [{ name: "data", type: "document", label: "Data" }],
  outputs: [{ name: "filing", type: "document", label: "Filing" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-red-700",
  flowType: "document",
  documentType: "tax-filing",
};

export const assetRegisterNode: NodeDefinition = {
  type: "asset-register",
  label: "Asset Register",
  category: "Finance",
  description: "Register or dispose fixed asset",
  icon: "\uD83C\uDFE2",
  inputs: [{ name: "document", type: "document", label: "Document" }],
  outputs: [{ name: "asset", type: "document", label: "Asset" }],
  configSchema: standardDocumentConfig,
  defaultConfig: { documentNumber: "", status: "draft", notes: "", reference: "" },
  color: "bg-zinc-700",
  flowType: "document",
  documentType: "asset-register",
};

export const financeNodes: NodeDefinition[] = [
  journalEntryNode,
  budgetRequestNode,
  bankReconciliationNode,
  taxFilingNode,
  assetRegisterNode,
];
