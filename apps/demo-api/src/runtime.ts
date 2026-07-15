import type { MmdEngine } from "mmd-engine";

import { createProductEngine } from "./product-engine";
import {
  PrismaProductAdapter,
  type ProductPrismaClient
} from "./prisma-adapter";

export interface ProductRuntime {
  engine: MmdEngine;
  dispose: () => Promise<void>;
}

type ProductPrismaClientFactory = (
  connectionString: string
) => Promise<ProductPrismaClient>;

type CleanupQueryClient = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
};

export interface DemoCleanupResult {
  sessionsDeleted: number;
  productsDeleted: number;
}

const CLEANUP_BATCH_SIZE = 1_000;
const CLEANUP_MAX_BATCHES = 20;
const DATABASE_POOL_MAX = 5;
const CLEANUP_QUERY = `
  SELECT "sessions_deleted", "products_deleted"
  FROM "mmd_cleanup_expired_demo_sessions"($1::timestamp, $2::integer)
`;

async function createProductPrismaClient(
  connectionString: string
): Promise<ProductPrismaClient> {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("./generated/prisma/client")
  ]);
  const adapter = new PrismaPg({
    connectionString,
    max: DATABASE_POOL_MAX
  });
  return new PrismaClient({ adapter }) as unknown as ProductPrismaClient;
}

async function disconnectClient(
  client: ProductPrismaClient,
  operation: "initialization" | "request" | "cleanup"
): Promise<void> {
  try {
    await client.$disconnect();
  } catch (error) {
    const described = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack ?? `${error.name}: ${error.message}`
        }
      : {
          name: "UnknownError",
          message: "Unknown Prisma disconnect failure"
        };
    console.error({
      event: "mmd_prisma_disconnect_error",
      operation,
      error: described
    });
  }
}

export class DatabaseRuntimeFactory {
  constructor(
    readonly createClient: ProductPrismaClientFactory =
      createProductPrismaClient
  ) {}

  async create(
    connectionString: string,
    sessionId: string
  ): Promise<ProductRuntime> {
    const client = await this.createClient(connectionString);
    const productAdapter = new PrismaProductAdapter(client, sessionId);
    try {
      await productAdapter.seed();
    } catch (error) {
      await disconnectClient(client, "initialization");
      throw error;
    }

    return {
      engine: createProductEngine(productAdapter),
      dispose: () => disconnectClient(client, "request")
    };
  }

  async cleanupExpiredSessions(
    connectionString: string,
    cutoff: Date
  ): Promise<DemoCleanupResult> {
    const client = (await this.createClient(
      connectionString
    )) as ProductPrismaClient & CleanupQueryClient;
    try {
      const total: DemoCleanupResult = {
        sessionsDeleted: 0,
        productsDeleted: 0
      };

      for (let batch = 0; batch < CLEANUP_MAX_BATCHES; batch += 1) {
        const [result] = await client.$queryRawUnsafe<
          Array<{ sessions_deleted: number; products_deleted: number }>
        >(CLEANUP_QUERY, cutoff.toISOString(), CLEANUP_BATCH_SIZE);
        const sessionsDeleted = Number(result?.sessions_deleted ?? 0);
        const productsDeleted = Number(result?.products_deleted ?? 0);
        total.sessionsDeleted += sessionsDeleted;
        total.productsDeleted += productsDeleted;
        if (sessionsDeleted === 0) break;
      }

      return total;
    } finally {
      await disconnectClient(client, "cleanup");
    }
  }
}

const databaseRuntimeFactory = new DatabaseRuntimeFactory();

export async function createDatabaseRuntime(
  connectionString: string,
  sessionId: string
): Promise<ProductRuntime> {
  return databaseRuntimeFactory.create(connectionString, sessionId);
}

export function cleanupExpiredDemoSessions(
  connectionString: string,
  cutoff: Date
): Promise<DemoCleanupResult> {
  return databaseRuntimeFactory.cleanupExpiredSessions(
    connectionString,
    cutoff
  );
}
