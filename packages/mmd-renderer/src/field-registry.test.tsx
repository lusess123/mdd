import { describe, expect, it } from "bun:test";
import type { ComponentType } from "react";

import { FieldRegistry } from "./field-registry";
import type { FieldRendererProps } from "./types";

const DefaultRating: ComponentType<FieldRendererProps> = () => null;
const CompactRating: ComponentType<FieldRendererProps> = () => null;

describe("FieldRegistry", () => {
  it("uses a scene renderer when provided and otherwise falls back to default", () => {
    const registry = new FieldRegistry().register("rating", {
      default: DefaultRating,
      list: CompactRating,
    });

    expect(registry.resolve("rating", "list")).toBe(CompactRating);
    expect(registry.resolve("rating", "detail")).toBe(DefaultRating);
  });

  it("prefers an explicit render type and falls back to the text renderer", () => {
    const ExplicitRenderer: ComponentType<FieldRendererProps> = () => null;
    const TextRenderer: ComponentType<FieldRendererProps> = () => null;
    const registry = new FieldRegistry()
      .register("Text", { default: TextRenderer })
      .register("CompactPrice", { list: ExplicitRenderer });

    expect(
      registry.resolveField(
        { name: "price", fieldType: "Money", renderType: "CompactPrice" },
        "list",
      ),
    ).toBe(ExplicitRenderer);
    expect(
      registry.resolveField({ name: "unsupported", fieldType: "Mystery" }, "detail"),
    ).toBe(TextRenderer);
  });

  it("falls back from an unknown custom renderer name to field semantics", () => {
    const NumberRenderer: ComponentType<FieldRendererProps> = () => null;
    const registry = new FieldRegistry().register("Number", {
      default: NumberRenderer,
    });

    expect(
      registry.resolveField(
        { name: "inventory", type: "inventory-meter", fieldType: "Number" },
        "list",
      ),
    ).toBe(NumberRenderer);
  });

  it("accepts the canonical renderer property from view metadata", () => {
    const CustomRenderer: ComponentType<FieldRendererProps> = () => null;
    const registry = new FieldRegistry().register("progress-bar", {
      list: CustomRenderer,
    });

    expect(
      registry.resolveField(
        { name: "progress", renderer: "progress-bar", fieldType: "Number" },
        "list",
      ),
    ).toBe(CustomRenderer);
  });
});
