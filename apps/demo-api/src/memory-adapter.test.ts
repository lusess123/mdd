import { describe, expect, it } from "bun:test";
import { productModel, type Product } from "mmd-contracts";

import { MemoryProductAdapter } from "./memory-adapter";

function product(id: string, price: number): Product {
  return {
    id,
    name: id,
    sku: id,
    cover: "",
    price,
    tags: [],
    status: "draft",
    inventory: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

describe("MemoryProductAdapter", () => {
  it("sorts and filters numeric fields numerically", async () => {
    const adapter = new MemoryProductAdapter([
      product("price-10", 10),
      product("price-2", 2),
      product("price-100", 100)
    ]);

    const rows = await adapter.findMany({
      model: productModel,
      fields: ["id", "price"],
      filter: { field: "price", operator: "gte", value: 10 },
      sort: [{ field: "price", direction: "asc" }],
      offset: 0,
      limit: 20
    });

    expect(rows).toEqual([
      { id: "price-10", price: 10 },
      { id: "price-100", price: 100 }
    ]);
  });
});
