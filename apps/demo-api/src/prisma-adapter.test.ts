import { describe, expect, it } from "bun:test";
import { productModel } from "mmd-contracts";

import {
  PrismaProductAdapter,
  type ProductPrismaClient
} from "./prisma-adapter";
import { seededProducts } from "./seed-products";

describe("PrismaProductAdapter", () => {
  it("keeps the session key private and scopes single-row updates", async () => {
    let updateQuery: Record<string, unknown> | undefined;
    const client: ProductPrismaClient = {
      demoSession: {
        async count() {
          return 1;
        }
      },
      product: {
        async count() {
          return 0;
        },
        async findMany() {
          return [];
        },
        async findFirst() {
          return { id: "product-1" };
        },
        async create(query) {
          return {
            id: "product-1",
            ...(query.data as Record<string, unknown>)
          };
        },
        async update(query) {
          updateQuery = query;
          return {
            id: "product-1",
            sessionId: "private_session",
            ...(query.data as Record<string, unknown>)
          };
        },
        async deleteMany() {
          return { count: 0 };
        }
      },
      async $executeRawUnsafe() {
        return 0;
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

    const updated = await adapter.update({
      model: productModel,
      key: "id",
      value: "product-1",
      data: { name: "Updated Product" }
    });

    expect(updated).toEqual({ id: "product-1", name: "Updated Product" });
    expect(updateQuery?.where).toEqual({
      id: "product-1",
      sessionId: "private_session"
    });
  });

  it("persists a marker so a cold runtime does not restore deleted seed rows", async () => {
    const sessions = new Set<string>();
    let productSeedCalls = 0;
    const client: ProductPrismaClient = {
      demoSession: {
        async count(query) {
          return sessions.has((query.where as { id: string }).id) ? 1 : 0;
        }
      },
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
        async create() {
          throw new Error("Not used");
        },
        async update() {
          throw new Error("Not used");
        },
        async deleteMany() {
          return { count: 0 };
        }
      },
      async $executeRawUnsafe(query, ...values) {
        expect(query).toContain('ON CONFLICT ("session_id", "sku") DO NOTHING');
        expect(query).toContain(`$${seededProducts.length * 11}`);
        expect(values).toHaveLength(seededProducts.length * 11);
        sessions.add(String(values[1]));
        productSeedCalls += 1;
        return 3;
      },
      async $disconnect() {}
    };

    await new PrismaProductAdapter(client, "persistent_session").seed();
    await new PrismaProductAdapter(client, "persistent_session").seed();

    expect(productSeedCalls).toBe(1);
  });
});
