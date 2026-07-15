import { describe, expect, it } from "bun:test";
import { MmdRequestError } from "mmd-renderer";

import { createMessages, translateApiError } from "../lib/i18n";
import { parseResponse } from "./mmd-provider";

describe("website MMD provider transport", () => {
  it("throws the shared localized request error with HTTP metadata", async () => {
    const messages = createMessages();
    const response = Response.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
          details: { retryAfter: 60 },
        },
      },
      { status: 429 },
    );

    const error = await parseResponse(response, (code, fallback) =>
      translateApiError(messages, "zh-CN", code, fallback),
    ).catch((cause) => cause);

    expect(error).toBeInstanceOf(MmdRequestError);
    expect(error).toMatchObject({
      message: "请求过于频繁，请稍后重试",
      status: 429,
      code: "RATE_LIMITED",
      details: { retryAfter: 60 },
    });
  });
});
