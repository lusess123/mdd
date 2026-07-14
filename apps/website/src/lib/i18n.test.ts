import { describe, expect, test } from "bun:test";

import { createMessages, detectLocale, translate } from "./i18n";

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
});
