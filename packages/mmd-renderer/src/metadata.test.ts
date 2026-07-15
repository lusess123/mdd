import { describe, expect, it } from "bun:test";

import { resolveContainerFields } from "./metadata";

describe("metadata adapters", () => {
  it("merges compact view fields with their model metadata", () => {
    const fields = resolveContainerFields(
      {
        name: "Product",
        type: "list",
        keyField: "id",
        fields: [{ name: "name" }, { name: "price", label: "Sale price" }],
      },
      {
        name: "Product",
        fields: [
          { name: "name", label: "Name", fieldType: "Text", required: true },
          { name: "price", label: "Price", fieldType: "Number" },
        ],
      },
    );

    expect(fields).toEqual([
      { name: "name", label: "Name", fieldType: "Text", required: true },
      { name: "price", label: "Sale price", fieldType: "Number" },
    ]);
  });
});
