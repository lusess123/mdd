import { describe, expect, it, mock, spyOn } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { MmdProvider, type MmdContextValue, useMmd } from "./provider";
import { MmdRequestError } from "./transport";

describe("provider error reporting", () => {
  it("reports one localized error across request and metadata loading", async () => {
    const onError = mock(() => undefined);
    const source = new MmdRequestError(
      "Too many requests",
      429,
      "RATE_LIMITED",
      { retryAfter: 60 },
    );
    let context: MmdContextValue | undefined;
    function CaptureContext() {
      context = useMmd();
      return null;
    }

    const consoleError = spyOn(console, "error").mockImplementation(
      () => undefined,
    );
    const consoleWarn = spyOn(console, "warn").mockImplementation(
      () => undefined,
    );
    let error: unknown;
    try {
      renderToString(
        createElement(
          MmdProvider,
          {
            api: { request: async () => Promise.reject(source) },
            locale: "zh-CN",
            onError,
          },
          createElement(CaptureContext),
        ),
      );
      error = await context
        ?.loadMeta({ models: ["Product"] })
        .catch((cause) => cause);
    } finally {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }

    expect(error).toBe(source);
    expect(error).toMatchObject({
      message: "请求过于频繁，请稍后重试",
      status: 429,
      code: "RATE_LIMITED",
      details: { retryAfter: 60 },
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
