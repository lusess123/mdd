import { describe, expect, it } from "bun:test";

import { createHttpMmdClient } from "./client";
import type { MmdRequest } from "./client";

describe("HTTP MMD client", () => {
  it("uses the default generic list endpoint and normalizes legacy list results", async () => {
    const calls: unknown[] = [];
    const request = (async (path: string, init?: RequestInit) => {
      calls.push({ path, init });
      return { list: [{ id: "p-1" }], count: 1 };
    }) as MmdRequest;
    const client = createHttpMmdClient(request);

    const result = await client.list({
      model: "Product",
      page: 2,
      pageSize: 10,
    });

    expect(calls).toEqual([
      {
        path: "/mmd/query-list",
        init: {
          method: "POST",
          body: JSON.stringify({ model: "Product", page: 2, pageSize: 10 }),
        },
      },
    ]);
    expect(result).toEqual({
      rows: [{ id: "p-1" }],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it("lets metadata actions target a custom GET endpoint", async () => {
    const calls: unknown[] = [];
    const request = (async (path: string, init?: RequestInit) => {
      calls.push({ path, init });
      return { url: "https://example.test/export.csv" };
    }) as MmdRequest;
    const client = createHttpMmdClient(request);

    await client.executeAction({
      action: "export",
      model: "Product",
      ids: ["p-1", "p-2"],
      url: "/exports",
      method: "GET",
    });

    expect(calls).toEqual([
      {
        path: "/exports?model=Product&ids=p-1&ids=p-2",
        init: { method: "GET" },
      },
    ]);
  });

  it("maps renderer save and action inputs to the canonical API contract", async () => {
    const calls: unknown[] = [];
    const request = (async (path: string, init?: RequestInit) => {
      calls.push({ path, init });
      return path.endsWith("/save")
        ? { data: { id: "p-1", name: "Paper" } }
        : { data: [{ id: "p-1", status: "PUBLISHED" }] };
    }) as MmdRequest;
    const client = createHttpMmdClient(request);

    await client.save({
      model: "Product",
      id: "p-1",
      row: { name: "Paper" },
    });
    await client.executeAction({
      action: "publish",
      model: "Product",
      ids: ["p-1"],
      row: { reason: "approved" },
    });

    expect(calls).toEqual([
      {
        path: "/mmd/save",
        init: {
          method: "POST",
          body: JSON.stringify({
            model: "Product",
            id: "p-1",
            data: { name: "Paper" },
          }),
        },
      },
      {
        path: "/mmd/actions/publish",
        init: {
          method: "POST",
          body: JSON.stringify({
            action: "publish",
            model: "Product",
            ids: ["p-1"],
            payload: { reason: "approved" },
          }),
        },
      },
    ]);
  });
});
