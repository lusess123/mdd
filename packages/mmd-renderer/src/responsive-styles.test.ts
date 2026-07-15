import { describe, expect, it } from "bun:test";

import { MMD_RESPONSIVE_STYLES } from "./responsive-styles";

describe("renderer responsive styles", () => {
  it("adapts to its container and keeps mobile dialogs inside safe areas", () => {
    expect(MMD_RESPONSIVE_STYLES).toContain("container: mmd-renderer / inline-size");
    expect(MMD_RESPONSIVE_STYLES).toContain("@container mmd-renderer");
    expect(MMD_RESPONSIVE_STYLES).toContain("100dvh");
    expect(MMD_RESPONSIVE_STYLES).toContain("safe-area-inset-bottom");
  });
});
