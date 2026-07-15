import { describe, expect, it } from "bun:test";

import { isNavigationActive } from "./navigation";

describe("site navigation", () => {
  it("keeps a section selected for trailing slashes and nested paths", () => {
    expect(isNavigationActive("/docs", "/docs")).toBe(true);
    expect(isNavigationActive("/docs/", "/docs")).toBe(true);
    expect(isNavigationActive("/docs/api/", "/docs")).toBe(true);
    expect(isNavigationActive("/examples/", "/docs")).toBe(false);
  });

  it("selects home only at the root path", () => {
    expect(isNavigationActive("/", "/")).toBe(true);
    expect(isNavigationActive("/docs/", "/")).toBe(false);
  });
});
