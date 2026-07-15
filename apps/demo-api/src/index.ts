import { createApp } from "./app";
import {
  cleanupExpiredDemoSessions,
  type DemoCleanupResult
} from "./runtime";

const app = createApp();

const DEMO_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

type CleanupExpiredSessions = (
  connectionString: string,
  cutoff: Date
) => Promise<DemoCleanupResult>;

interface ScheduledController {
  scheduledTime: number;
}

interface WorkerBindings {
  HYPERDRIVE?: {
    connectionString: string;
  };
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
      const connectionString = environment.HYPERDRIVE?.connectionString;
      if (!connectionString) {
        throw new Error(
          "HYPERDRIVE binding is required for demo session cleanup"
        );
      }
      const cutoff = new Date(controller.scheduledTime - DEMO_SESSION_TTL_MS);
      const result = await cleanup(connectionString, cutoff);
      console.info("MMD demo session cleanup completed", result);
    }
  };
}

export type AppType = typeof app;
export { createApp };
export default createWorker(app);
