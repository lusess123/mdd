import type { MmdEngine } from "mmd-engine";

import { MemoryProductAdapter } from "./memory-adapter";
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
  databaseUrl: string
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
const CLEANUP_QUERY = `
  SELECT "sessions_deleted", "products_deleted"
  FROM "mmd_cleanup_expired_demo_sessions"($1::timestamp, $2::integer)
`;

async function createProductPrismaClient(
  databaseUrl: string
): Promise<ProductPrismaClient> {
  const [{ PrismaNeon }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-neon"),
    import("./generated/prisma/client")
  ]);
  const adapter = new PrismaNeon({ connectionString: databaseUrl });
  return new PrismaClient({ adapter }) as unknown as ProductPrismaClient;
}

export class NeonRuntimeFactory {
  readonly #clients = new Map<string, Promise<ProductPrismaClient>>();
  readonly #seededSessions = new WeakMap<
    ProductPrismaClient,
    Map<string, Promise<void>>
  >();

  constructor(
    readonly createClient: ProductPrismaClientFactory =
      createProductPrismaClient
  ) {}

  async create(databaseUrl: string, sessionId: string): Promise<ProductRuntime> {
    const client = await this.#getClient(databaseUrl);
    const productAdapter = new PrismaProductAdapter(client, sessionId);
    await this.#ensureSeeded(client, sessionId, productAdapter);

    return {
      engine: createProductEngine(productAdapter),
      dispose: async () => undefined
    };
  }

  async cleanupExpiredSessions(
    databaseUrl: string,
    cutoff: Date
  ): Promise<DemoCleanupResult> {
    const client = (await this.#getClient(databaseUrl)) as ProductPrismaClient &
      CleanupQueryClient;
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

    if (total.sessionsDeleted > 0) this.#seededSessions.delete(client);
    return total;
  }

  #getClient(databaseUrl: string): Promise<ProductPrismaClient> {
    const cached = this.#clients.get(databaseUrl);
    if (cached) return cached;

    const pending = this.createClient(databaseUrl);
    this.#clients.set(databaseUrl, pending);
    void pending.catch(() => {
      if (this.#clients.get(databaseUrl) === pending) {
        this.#clients.delete(databaseUrl);
      }
    });
    return pending;
  }

  #ensureSeeded(
    client: ProductPrismaClient,
    sessionId: string,
    adapter: PrismaProductAdapter
  ): Promise<void> {
    let sessions = this.#seededSessions.get(client);
    if (!sessions) {
      sessions = new Map();
      this.#seededSessions.set(client, sessions);
    }

    const cached = sessions.get(sessionId);
    if (cached) return cached;

    const pending = adapter.seed();
    sessions.set(sessionId, pending);
    void pending.catch(() => {
      if (sessions.get(sessionId) === pending) sessions.delete(sessionId);
    });
    return pending;
  }
}

const neonRuntimeFactory = new NeonRuntimeFactory();

export function createMemoryRuntime(): ProductRuntime {
  return {
    engine: createProductEngine(new MemoryProductAdapter()),
    dispose: async () => undefined
  };
}

export async function createNeonRuntime(
  databaseUrl: string,
  sessionId: string
): Promise<ProductRuntime> {
  return neonRuntimeFactory.create(databaseUrl, sessionId);
}

export function cleanupExpiredDemoSessions(
  databaseUrl: string,
  cutoff: Date
): Promise<DemoCleanupResult> {
  return neonRuntimeFactory.cleanupExpiredSessions(databaseUrl, cutoff);
}
