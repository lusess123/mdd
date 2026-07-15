import { describe, expect, it } from "bun:test";

import { createFetchMmdRequest } from "./transport";

describe("default transport", () => {
  it("joins the API base URL and applies custom auth headers", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const request = createFetchMmdRequest({
      api: {
        baseUrl: "/api",
        timeoutMs: 1_000,
        credentials: "include",
        headers: { "x-app": "demo" },
      },
      auth: {
        mode: "custom",
        getToken: () => "secret",
        getHeaders: () => ({ "x-tenant": "tenant-1" }),
      },
      fetch: async (input, init) => {
        calls.push({ input, init });
        return Response.json({ ok: true });
      },
    });

    await request("/mmd/meta", { method: "POST", body: "{}" });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/api/mmd/meta");
    expect(new Headers(calls[0]?.init?.headers)).toEqual(
      new Headers({
        authorization: "Bearer secret",
        "content-type": "application/json",
        "x-app": "demo",
        "x-tenant": "tenant-1",
      }),
    );
    expect(calls[0]?.init?.credentials).toBe("include");
  });
});
