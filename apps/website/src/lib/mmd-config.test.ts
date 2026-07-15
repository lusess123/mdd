import { describe, expect, test } from "bun:test";

import { resolveMmdConfig } from "./mmd-config";

describe("resolveMmdConfig", () => {
  test("零配置时提供可直接运行的默认实现", () => {
    const config = resolveMmdConfig();

    expect(config.api.baseUrl).toBe("/api");
    expect(config.api.timeoutMs).toBe(10_000);
    expect(config.api.credentials).toBe("same-origin");
    expect(config.auth.mode).toBe("anonymous");
    expect(config.router.mode).toBe("hash");
  });

  test("组件配置依次覆盖 Provider、环境变量和默认值", () => {
    const providerError = () => undefined;
    const componentError = () => undefined;
    const config = resolveMmdConfig({
      environment: { apiBaseUrl: "https://env.example.com/api" },
      provider: {
        api: { baseUrl: "https://provider.example.com/api", timeoutMs: 6_000 },
        onError: providerError,
      },
      component: {
        api: { timeoutMs: 2_000 },
        onError: componentError,
      },
    });

    expect(config.api.baseUrl).toBe("https://provider.example.com/api");
    expect(config.api.timeoutMs).toBe(2_000);
    expect(config.api.credentials).toBe("same-origin");
    expect(config.onError).toBe(componentError);
  });

  test("Provider 可覆盖语言和局部文案，组件语言优先", () => {
    const config = resolveMmdConfig({
      provider: {
        locale: "en-US",
        messages: { "en-US": { "feedback.saved": "All set" } },
      },
      component: { locale: "zh-CN" },
    });

    expect(config.locale).toBe("zh-CN");
    expect(config.messages["en-US"]["feedback.saved"]).toBe("All set");
    expect(config.messages["zh-CN"]["feedback.saved"]).toBe("保存成功");
  });
});
