"use client";

import {
  MmdProvider,
  MmdRenderer,
  type ActionHandler,
} from "mmd-renderer";

const duplicate: ActionHandler = async (context, action) => {
  const key = context.keyField ?? "id";
  const id = context.record?.[key];
  if (id === undefined || id === null) return;

  const data = await context.client.executeAction({
    model: context.model,
    action: action.name ?? "duplicate",
    ids: [String(id)],
    row: context.record,
  });
  return { data, refresh: true };
};

export function ProductWithCustomAction() {
  return (
    <MmdProvider
      environment={{ apiBaseUrl: "http://localhost:8787/api" }}
      api={{ credentials: "include" }}
      actions={{ duplicate }}
    >
      <MmdRenderer model="Product" view="listview" />
    </MmdProvider>
  );
}
