import { createApp } from "./app";
import {
  cleanupExpiredDemoSessions,
  type DemoCleanupResult
} from "./runtime";

const app = createApp();

const DEMO_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

type CleanupExpiredSessions = (
  databaseUrl: string,
  cutoff: Date
) => Promise<DemoCleanupResult>;

interface ScheduledController {
  scheduledTime: number;
}

interface WorkerBindings {
  DATABASE_URL?: string;
}

export function createWorker(
  workerApp: ReturnType<typeof createApp>,
  cleanup: CleanupExpiredSessions = cleanupExpiredDemoSessions
) {
  return {
    fetch: workerApp.fetch,
    async scheduled(
      controller: ScheduledController,
      environment: WorkerBindings
    ): Promise<void> {
      if (!environment.DATABASE_URL) {
        throw new Error("DATABASE_URL is required for demo session cleanup");
      }
      const cutoff = new Date(controller.scheduledTime - DEMO_SESSION_TTL_MS);
      const result = await cleanup(environment.DATABASE_URL, cutoff);
      console.info("MMD demo session cleanup completed", result);
    }
  };
}

export type AppType = typeof app;
export { createApp };
export default createWorker(app);
