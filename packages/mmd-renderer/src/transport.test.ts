import { describe, expect, it } from "bun:test";

import { createMessageCatalog, translate } from "./i18n";
import {
  createFetchMmdRequest,
  localizeMmdRequestError,
  MmdRequestError,
} from "./transport";

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

  it("localizes known API error codes and preserves error metadata", () => {
    const catalog = createMessageCatalog();
    const error = new MmdRequestError(
      "Too many requests",
      429,
      "RATE_LIMITED",
      { retryAfter: 60 },
    );

    const localized = localizeMmdRequestError(error, (key) =>
      translate(catalog, "zh-CN", key),
    );

    expect(localized).toBe(error);
    expect(localized).toMatchObject({
      message: "请求过于频繁，请稍后重试",
      status: 429,
      code: "RATE_LIMITED",
      details: { retryAfter: 60 },
    });
  });

  it("keeps the server message for unknown API error codes", () => {
    const catalog = createMessageCatalog();
    const error = new MmdRequestError("Custom failure", 418, "CUSTOM_ERROR");

    expect(
      localizeMmdRequestError(error, (key) =>
        translate(catalog, "zh-CN", key),
      ),
    ).toBe(error);
  });
});
