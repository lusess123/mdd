import { describe, expect, it } from "bun:test";

import { createApp, createWorker } from "./index";

describe("MMD demo scheduled cleanup", () => {
  it("removes sessions inactive for seven days", async () => {
    const calls: Array<{ connectionString: string; cutoff: Date }> = [];
    const worker = createWorker(createApp(), async (connectionString, cutoff) => {
      calls.push({ connectionString, cutoff });
      return { sessionsDeleted: 3, productsDeleted: 9 };
    });
    const scheduledTime = Date.parse("2026-07-15T03:00:00.000Z");

    await worker.scheduled(
      { scheduledTime },
      { HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }
    );

    expect(calls).toEqual([
      {
        connectionString: "postgres://hyperdrive",
        cutoff: new Date("2026-07-08T03:00:00.000Z")
      }
    ]);
  });

  it("fails visibly instead of falling back to a production DATABASE_URL", async () => {
    const worker = createWorker(createApp());

    expect(
      worker.scheduled(
        { scheduledTime: Date.now() },
        { DATABASE_URL: "postgres://legacy-production-url" } as never
      )
    ).rejects.toThrow("HYPERDRIVE binding is required");
  });
});
