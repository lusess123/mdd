import { describe, expect, it } from "bun:test";
import { MmdRequestError } from "mmd-renderer";

import { describeRequestFailure } from "./playground-content";

describe("playground request failures", () => {
  it("keeps HTTP failures reachable and exposes their metadata", () => {
    const failure = describeRequestFailure(
      new MmdRequestError(
        "请求过于频繁，请稍后重试",
        429,
        "RATE_LIMITED",
        { retryAfter: 60 },
      ),
    );

    expect(failure.apiOnline).toBe(true);
    expect(failure.response).toEqual({
      error: {
        message: "请求过于频繁，请稍后重试",
        status: 429,
        code: "RATE_LIMITED",
        details: { retryAfter: 60 },
      },
    });
  });

  it("marks errors without an HTTP status as unreachable", () => {
    const failure = describeRequestFailure(new TypeError("fetch failed"));

    expect(failure.apiOnline).toBe(false);
    expect(failure.response).toEqual({
      error: { message: "fetch failed" },
    });
  });
});
