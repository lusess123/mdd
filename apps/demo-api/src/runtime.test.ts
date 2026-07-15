import { describe, expect, it, spyOn } from "bun:test";

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
  it("creates and disconnects one Prisma client per runtime", async () => {
    let clientCreations = 0;
    let disconnects = 0;

    const factory = new NeonRuntimeFactory(async () => {
      clientCreations += 1;
      const clientId = clientCreations;
      const sessionMarkers = new Set<string>();
      return {
        demoSession: {
          async count(query) {
            return sessionMarkers.has((query.where as { id: string }).id)
              ? 1
              : 0;
          }
        },
        product: {
          async count() {
            return 1;
          },
          async findMany(query) {
            return [
              { id: `client_${clientId}:${filteredSession(query) ?? ""}` }
            ];
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
        async $executeRawUnsafe(_query, ...values) {
          sessionMarkers.add(String(values[1]));
          return 3;
        },
        async $disconnect() {
          disconnects += 1;
          if (clientId === 2) throw new Error("disconnect failed");
        }
      };
    });

    const first = await factory.create("postgres://demo", "session_a");
    const second = await factory.create("postgres://demo", "session_b");

    const [firstList, secondList] = await Promise.all([
      first.engine.queryList({ model: "Product", fields: ["id"] }),
      second.engine.queryList({ model: "Product", fields: ["id"] })
    ]);

    expect(clientCreations).toBe(2);
    expect(firstList.data).toEqual([{ id: "client_1:session_a" }]);
    expect(secondList.data).toEqual([{ id: "client_2:session_b" }]);

    const consoleError = spyOn(console, "error").mockImplementation(
      () => undefined
    );
    try {
      await expect(
        Promise.all([first.dispose(), second.dispose()])
      ).resolves.toEqual([undefined, undefined]);
      expect(disconnects).toBe(2);
      expect(consoleError).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "mmd_prisma_disconnect_error",
          operation: "request",
          error: expect.objectContaining({ message: "disconnect failed" })
        })
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("disconnects the Prisma client when runtime initialization fails", async () => {
    let disconnects = 0;
    const factory = new NeonRuntimeFactory(async () => ({
      demoSession: {
        async count() {
          throw new Error("seed failed");
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
      async $executeRawUnsafe() {
        throw new Error("Not used");
      },
      async $disconnect() {
        disconnects += 1;
      }
    }));

    await expect(factory.create("postgres://demo", "session_a")).rejects.toThrow(
      "seed failed"
    );
    expect(disconnects).toBe(1);
  });

  it("cleans expired sessions in bounded database batches", async () => {
    const calls: Array<{ query: string; values: unknown[] }> = [];
    let disconnects = 0;
    const results = [
      [{ sessions_deleted: 1_000, products_deleted: 3_000 }],
      [{ sessions_deleted: 2, products_deleted: 5 }],
      [{ sessions_deleted: 0, products_deleted: 0 }]
    ];
    const client = {
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
      async $executeRawUnsafe() {
        throw new Error("Not used");
      },
      async $queryRawUnsafe(query: string, ...values: unknown[]) {
        calls.push({ query, values });
        return results[calls.length - 1] ?? [];
      },
      async $disconnect() {
        disconnects += 1;
      }
    } satisfies ProductPrismaClient & {
      $queryRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
    };
    const factory = new NeonRuntimeFactory(async () => client);
    const cutoff = new Date("2026-07-08T03:00:00.000Z");

    const result = await factory.cleanupExpiredSessions(
      "postgres://demo",
      cutoff
    );

    expect(result).toEqual({ sessionsDeleted: 1_002, productsDeleted: 3_005 });
    expect(calls).toHaveLength(3);
    expect(disconnects).toBe(1);
    expect(calls[0]?.query).toContain("mmd_cleanup_expired_demo_sessions");
    expect(calls[0]?.values).toEqual([cutoff.toISOString(), 1_000]);
  });
});
