import { describe, expect, it } from "bun:test";

import { resolveMmdConfig } from "./config";

describe("MMD renderer config", () => {
  it("provides local defaults and applies overrides in component-first order", () => {
    const config = resolveMmdConfig({
      environment: { apiBaseUrl: "https://env.example/api", locale: "en-US" },
      provider: { api: { timeoutMs: 5_000 }, locale: "zh-CN" },
      component: { api: { baseUrl: "/custom" } },
    });

    expect(config.api).toMatchObject({
      baseUrl: "/custom",
      timeoutMs: 5_000,
      credentials: "same-origin",
    });
    expect(config.auth).toEqual({ mode: "anonymous" });
    expect(config.router).toEqual({ mode: "hash" });
    expect(config.locale).toBe("zh-CN");
  });
});
