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
