import { describe, expect, it } from "bun:test";

import type { ProductPrismaClient } from "./prisma-adapter";
import { NeonRuntimeFactory } from "./runtime";

type Query = Record<string, unknown>;

function filteredSession(query: Query): string | undefined {
  const where = query.where as { AND?: unknown[] } | undefined;
  const sessionFilter = where?.AND?.[0] as
    | Record<string, unknown>
    | undefined;
  return typeof sessionFilter?.sessionId === "string"
    ? sessionFilter.sessionId
    : undefined;
}

describe("NeonRuntimeFactory", () => {
  it("reuses one Prisma client without sharing session-bound adapters", async () => {
    const seededSessions: string[] = [];
    let clientCreations = 0;
    let disconnects = 0;

    const client: ProductPrismaClient = {
      product: {
        async count() {
          return 1;
        },
        async findMany(query) {
          return [{ id: filteredSession(query) }];
        },
        async findFirst() {
          return null;
        },
        async create() {
          throw new Error("Not used");
        },
        async createMany(query) {
          const data = query.data as Array<Record<string, unknown>>;
          const session = data[0]?.sessionId;
          if (typeof session === "string") seededSessions.push(session);
          return { count: 0 };
        },
        async updateMany() {
          return { count: 0 };
        },
        async deleteMany() {
          return { count: 0 };
        }
      },
      async $disconnect() {
        disconnects += 1;
      }
    };

    const factory = new NeonRuntimeFactory(async () => {
      clientCreations += 1;
      return client;
    });

    const first = await factory.create("postgres://demo", "session_a");
    await factory.create("postgres://demo", "session_a");
    const second = await factory.create("postgres://demo", "session_b");

    const [firstList, secondList] = await Promise.all([
      first.engine.queryList({ model: "Product", fields: ["id"] }),
      second.engine.queryList({ model: "Product", fields: ["id"] })
    ]);

    expect(clientCreations).toBe(1);
    expect(seededSessions).toEqual(["session_a", "session_b"]);
    expect(firstList.data).toEqual([{ id: "session_a" }]);
    expect(secondList.data).toEqual([{ id: "session_b" }]);

    await Promise.all([first.dispose(), second.dispose()]);
    expect(disconnects).toBe(0);
  });
});
