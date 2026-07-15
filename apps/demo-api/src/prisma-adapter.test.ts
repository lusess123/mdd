import { describe, expect, it } from "bun:test";
import { productModel } from "mmd-contracts";

import {
  PrismaProductAdapter,
  type ProductPrismaClient
} from "./prisma-adapter";

describe("PrismaProductAdapter", () => {
  it("keeps the session isolation key out of public rows", async () => {
    const client: ProductPrismaClient = {
      demoSession: {
        async count() {
          return 1;
        },
        async createMany() {
          return { count: 0 };
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

  it("persists a marker so a cold runtime does not restore deleted seed rows", async () => {
    const sessions = new Set<string>();
    let productSeedCalls = 0;
    const client: ProductPrismaClient = {
      demoSession: {
        async count(query) {
          return sessions.has((query.where as { id: string }).id) ? 1 : 0;
        },
        async createMany(query) {
          const data = query.data as Array<{ id: string }>;
          data.forEach(({ id }) => sessions.add(id));
          return { count: data.length };
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
        async createMany() {
          productSeedCalls += 1;
          return { count: 3 };
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

    await new PrismaProductAdapter(client, "persistent_session").seed();
    await new PrismaProductAdapter(client, "persistent_session").seed();

    expect(productSeedCalls).toBe(1);
  });
});
