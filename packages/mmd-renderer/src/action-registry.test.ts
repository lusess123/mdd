import { describe, expect, it } from "bun:test";

import { ActionRegistry, createDefaultActionRegistry } from "./action-registry";
import type { ActionExecutionContext, MmdClient } from "./types";

const unusedClient = {} as MmdClient;

describe("ActionRegistry", () => {
  it("dispatches an extension action with the current record", async () => {
    const calls: unknown[] = [];
    const registry = new ActionRegistry().register("approve-order", async (context) => {
      calls.push(context.record);
      return { refresh: true };
    });
    const context = {
      model: "Order",
      client: unusedClient,
      record: { id: "order-1" },
    } satisfies ActionExecutionContext;

    const result = await registry.execute(
      { label: "Approve", type: "custom", extend: "approve-order" },
      context,
    );

    expect(calls).toEqual([{ id: "order-1" }]);
    expect(result).toEqual({ refresh: true });
  });

  it("uses the canonical handler name for custom actions", async () => {
    const registry = new ActionRegistry().register("send-invoice", () => ({
      data: "sent",
    }));

    const result = await registry.execute(
      { label: "Send", type: "custom", handler: "send-invoice" },
      { model: "Invoice", client: unusedClient },
    );

    expect(result).toEqual({ data: "sent" });
  });
});

describe("default actions", () => {
  it("deletes selected rows and refreshes the container", async () => {
    const calls: unknown[] = [];
    const client = {
      ...unusedClient,
      remove: async (input) => {
        calls.push(input);
        return { affected: input.ids.length };
      },
    } satisfies MmdClient;
    const context = {
      model: "Order",
      client,
      selectedIds: ["order-1", "order-2"],
      refresh: async () => {
        calls.push("refresh");
      },
    } satisfies ActionExecutionContext;

    await createDefaultActionRegistry().execute(
      { label: "Delete", type: "del" },
      context,
    );

    expect(calls).toEqual([
      { model: "Order", ids: ["order-1", "order-2"] },
      "refresh",
    ]);
  });
});
