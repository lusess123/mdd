import type { ActionDefinition } from "mmd-contracts";

export const productActions: ActionDefinition[] = [
  {
    name: "publish",
    label: "Publish",
    placement: "row",
    tone: "primary",
    showExpression: 'row.status === "draft"',
  },
  {
    name: "archive",
    label: "Archive",
    placement: "row",
    confirm: true,
    showExpression: 'row.status !== "archived"',
  },
  {
    name: "duplicate",
    label: "Duplicate",
    placement: "row",
  },
];
