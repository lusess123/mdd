import { describe, expect, it } from "bun:test";
import { productModel } from "mmd-contracts";

import {
  PrismaProductAdapter,
  type ProductPrismaClient
} from "./prisma-adapter";

describe("PrismaProductAdapter", () => {
  it("keeps the session isolation key out of public rows", async () => {
    const client: ProductPrismaClient = {
      product: {
        async count() {
          return 0;
        },
        async findMany() {
          return [];
        },
        async findFirst() {
          return null;
        },
        async create(query) {
          return {
            id: "product-1",
            ...(query.data as Record<string, unknown>)
          };
        },
        async createMany() {
          return { count: 0 };
        },
        async updateMany() {
          return { count: 0 };
        },
        async deleteMany() {
          return { count: 0 };
        }
      },
      async $disconnect() {}
    };
    const adapter = new PrismaProductAdapter(client, "private_session");

    const product = await adapter.create({
      model: productModel,
      data: { name: "Public Product" }
    });

    expect(product).toEqual({ id: "product-1", name: "Public Product" });
    expect(product).not.toHaveProperty("sessionId");
  });
});
