import { describe, expect, it } from "bun:test";

import { createApp, createWorker } from "./index";

describe("MMD demo scheduled cleanup", () => {
  it("removes sessions inactive for seven days", async () => {
    const calls: Array<{ databaseUrl: string; cutoff: Date }> = [];
    const worker = createWorker(createApp(), async (databaseUrl, cutoff) => {
      calls.push({ databaseUrl, cutoff });
      return { sessionsDeleted: 3, productsDeleted: 9 };
    });
    const scheduledTime = Date.parse("2026-07-15T03:00:00.000Z");

    await worker.scheduled(
      { scheduledTime },
      { DATABASE_URL: "postgres://demo" }
    );

    expect(calls).toEqual([
      {
        databaseUrl: "postgres://demo",
        cutoff: new Date("2026-07-08T03:00:00.000Z")
      }
    ]);
  });

  it("fails visibly when the database binding is missing", async () => {
    const worker = createWorker(createApp());

    expect(worker.scheduled({ scheduledTime: Date.now() }, {})).rejects.toThrow(
      "DATABASE_URL is required"
    );
  });
});
