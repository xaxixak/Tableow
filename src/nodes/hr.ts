import type { NodeDefinition } from "../types/index.ts";

export const leaveRequestNode: NodeDefinition = {
  type: "leave-request",
  label: "Leave Request",
  category: "HR",
  description: "Submit employee leave request",
  icon: "\uD83C\uDFD6\uFE0F",
  inputs: [],
  outputs: [
    { name: "approved", type: "document", label: "Approved" },
    { name: "rejected", type: "document", label: "Rejected" },
  ],
  configSchema: [
    {
      key: "leaveType",
      label: "Leave Type",
      type: "select",
      options: [
        { label: "Annual", value: "annual" },
        { label: "Sick", value: "sick" },
        { label: "Personal", value: "personal" },
        { label: "Maternity", value: "maternity" },
      ],
      defaultValue: "annual",
    },
    {
      key: "days",
      label: "Number of Days",
      type: "number",
      defaultValue: 1,
    },
  ],
  defaultConfig: { leaveType: "annual", days: 1 },
  color: "bg-green-600",
  flowType: "decision",
  documentType: "leave-request",
};

export const expenseClaimNode: NodeDefinition = {
  type: "expense-claim",
  label: "Expense Claim",
  category: "HR",
  description: "Submit employee expense claim",
  icon: "\uD83D\uDCB0",
  inputs: [],
  outputs: [{ name: "claim", type: "document", label: "Claim" }],
  configSchema: [
    {
      key: "category",
      label: "Expense Category",
      type: "select",
      options: [
        { label: "Travel", value: "travel" },
        { label: "Meals", value: "meals" },
        { label: "Office Supplies", value: "supplies" },
        { label: "Other", value: "other" },
      ],
      defaultValue: "travel",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      defaultValue: 0,
    },
  ],
  defaultConfig: { category: "travel", amount: 0 },
  color: "bg-amber-600",
  flowType: "start",
  documentType: "expense-claim",
};

export const timesheetNode: NodeDefinition = {
  type: "timesheet",
  label: "Timesheet",
  category: "HR",
  description: "Employee timesheet entry",
  icon: "\u23F0",
  inputs: [],
  outputs: [{ name: "timesheet", type: "document", label: "Timesheet" }],
  configSchema: [
    {
      key: "period",
      label: "Period",
      type: "select",
      options: [
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
        { label: "Monthly", value: "monthly" },
      ],
      defaultValue: "weekly",
    },
    {
      key: "hours",
      label: "Total Hours",
      type: "number",
      defaultValue: 0,
    },
  ],
  defaultConfig: { period: "weekly", hours: 0 },
  color: "bg-sky-600",
  flowType: "start",
  documentType: "timesheet",
};

export const travelRequestNode: NodeDefinition = {
  type: "travel-request",
  label: "Travel Request",
  category: "HR",
  description: "Submit business travel request",
  icon: "\u2708\uFE0F",
  inputs: [],
  outputs: [
    { name: "approved", type: "document", label: "Approved" },
    { name: "rejected", type: "document", label: "Rejected" },
  ],
  configSchema: [
    {
      key: "destination",
      label: "Destination",
      type: "text",
      defaultValue: "",
    },
    {
      key: "purpose",
      label: "Purpose",
      type: "text",
      defaultValue: "",
    },
    {
      key: "estimatedCost",
      label: "Estimated Cost",
      type: "number",
      defaultValue: 0,
    },
  ],
  defaultConfig: { destination: "", purpose: "", estimatedCost: 0 },
  color: "bg-indigo-600",
  flowType: "decision",
  documentType: "travel-request",
};

export const overtimeRequestNode: NodeDefinition = {
  type: "overtime-request",
  label: "Overtime Request",
  category: "HR",
  description: "Submit overtime work request",
  icon: "\uD83C\uDF19",
  inputs: [],
  outputs: [
    { name: "approved", type: "document", label: "Approved" },
    { name: "rejected", type: "document", label: "Rejected" },
  ],
  configSchema: [
    {
      key: "hours",
      label: "OT Hours",
      type: "number",
      defaultValue: 0,
    },
    {
      key: "reason",
      label: "Reason",
      type: "text",
      defaultValue: "",
    },
  ],
  defaultConfig: { hours: 0, reason: "" },
  color: "bg-violet-600",
  flowType: "decision",
  documentType: "overtime-request",
};

export const hrNodes: NodeDefinition[] = [
  leaveRequestNode,
  expenseClaimNode,
  timesheetNode,
  travelRequestNode,
  overtimeRequestNode,
];
