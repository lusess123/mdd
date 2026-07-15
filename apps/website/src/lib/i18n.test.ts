import { describe, expect, test } from "bun:test";

import {
  createMessages,
  detectLocale,
  translate,
  translateApiError,
} from "./i18n";

describe("i18n messages", () => {
  test("内置中英文文案可被使用方按语言局部覆盖", () => {
    const messages = createMessages({
      "en-US": { "actions.publish": "Ship now" },
    });

    expect(translate(messages, "zh-CN", "actions.publish")).toBe("发布");
    expect(translate(messages, "en-US", "actions.publish")).toBe("Ship now");
    expect(translate(messages, "en-US", "actions.archive")).toBe("Archive");
  });

  test("记住的语言优先于浏览器语言", () => {
    expect(detectLocale("zh-CN", "en-GB")).toBe("zh-CN");
    expect(detectLocale(null, "en-US")).toBe("en-US");
    expect(detectLocale(null, "zh-HK")).toBe("zh-CN");
  });

  test("API 错误码按当前语言翻译，未知错误保留后端文案", () => {
    const messages = createMessages();

    expect(
      translateApiError(messages, "zh-CN", "SKU_CONFLICT", "SKU exists"),
    ).toBe("SKU 已存在");
    expect(
      translateApiError(messages, "en-US", "PRODUCT_NOT_FOUND", "missing"),
    ).toBe("Product not found");
    expect(
      translateApiError(messages, "zh-CN", "INTERNAL_ERROR", "failed"),
    ).toBe("服务端发生错误");
    expect(
      translateApiError(messages, "zh-CN", "RATE_LIMITED", "busy"),
    ).toBe("请求过于频繁，请稍后重试");
    expect(
      translateApiError(messages, "en-US", "SESSION_RECORD_LIMIT", "full"),
    ).toBe("Demo sessions are limited to 50 records");
    expect(
      translateApiError(messages, "zh-CN", "UNKNOWN", "Server fallback"),
    ).toBe("Server fallback");
  });
});
