import type { MmdDataAdapter, FilterExpression } from "mmd-engine";

import { seededProducts } from "./seed-products";

type Row = Record<string, unknown>;
type Query = Record<string, unknown>;

interface ProductDelegate {
  count(args: Query): Promise<number>;
  findMany(args: Query): Promise<unknown[]>;
  findFirst(args: Query): Promise<unknown | null>;
  create(args: Query): Promise<unknown>;
  update(args: Query): Promise<unknown>;
  deleteMany(args: Query): Promise<{ count: number }>;
}

interface DemoSessionDelegate {
  count(args: Query): Promise<number>;
}

export interface ProductPrismaClient {
  product: ProductDelegate;
  demoSession: DemoSessionDelegate;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $disconnect(): Promise<void>;
}

const SEED_COLUMN_COUNT = 11;
const SEED_QUERY = `
  INSERT INTO "mmd_products" (
    "id", "session_id", "name", "sku", "cover", "price", "tags",
    "status", "inventory", "created_at", "updated_at"
  )
  VALUES ${seededProducts
    .map((_, index) => {
      const first = index * SEED_COLUMN_COUNT + 1;
      return `(${Array.from(
        { length: SEED_COLUMN_COUNT },
        (_value, offset) => `$${first + offset}`
      ).join(", ")})`;
    })
    .join(",\n    ")}
  ON CONFLICT ("session_id", "sku") DO NOTHING
`;

function where(expression?: FilterExpression): Query {
  if (!expression) return {};
  if ("and" in expression) return { AND: expression.and.map(where) };
  if ("or" in expression) return { OR: expression.or.map(where) };

  const value = expression.value;
  switch (expression.operator) {
    case "eq":
      return { [expression.field]: value };
    case "contains":
      return expression.field === "tags"
        ? { [expression.field]: { has: value } }
        : Array.isArray(value)
        ? { [expression.field]: { hasEvery: value } }
        : {
            [expression.field]: {
              contains: value,
              mode: "insensitive"
            }
          };
    case "in":
      return { [expression.field]: { in: value } };
    case "gte":
      return { [expression.field]: { gte: value } };
    case "lte":
      return { [expression.field]: { lte: value } };
  }
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== "object") return value;
  if ("d" in value && "s" in value && "e" in value && "toString" in value) {
    return Number(String(value));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalize(item)])
  );
}

function row(value: unknown): Row {
  const normalized = normalize(value) as Row;
  if (!normalized || typeof normalized !== "object") return normalized;
  const { sessionId: _sessionId, ...publicRow } = normalized;
  return publicRow;
}

function select(fields: string[]): Query {
  return Object.fromEntries(fields.map((field) => [field, true]));
}

export class PrismaProductAdapter implements MmdDataAdapter {
  constructor(
    readonly client: ProductPrismaClient,
    readonly sessionId: string
  ) {}

  async seed(): Promise<void> {
    const knownSession = await this.client.demoSession.count({
      where: { id: this.sessionId }
    });
    if (knownSession > 0) return;

    const values = seededProducts.flatMap((product) => [
      crypto.randomUUID(),
      this.sessionId,
      product.name,
      product.sku,
      product.cover,
      product.price,
      product.tags,
      product.status,
      product.inventory,
      new Date(product.createdAt),
      new Date(product.updatedAt)
    ]);
    await this.client.$executeRawUnsafe(SEED_QUERY, ...values);
  }

  async findMany(input: Parameters<MmdDataAdapter["findMany"]>[0]) {
    const values = await this.client.product.findMany({
      where: { AND: [{ sessionId: this.sessionId }, where(input.filter)] },
      orderBy: input.sort.map((sort) => ({ [sort.field]: sort.direction })),
      skip: input.offset,
      take: input.limit,
      select: select(input.fields)
    });
    return values.map(row);
  }

  count(input: Parameters<MmdDataAdapter["count"]>[0]) {
    return this.client.product.count({
      where: { AND: [{ sessionId: this.sessionId }, where(input.filter)] }
    });
  }

  async findOne(input: Parameters<MmdDataAdapter["findOne"]>[0]) {
    const value = await this.client.product.findFirst({
      where: { sessionId: this.sessionId, [input.key]: input.value },
      select: select(input.fields)
    });
    return value ? row(value) : null;
  }

  async create(input: Parameters<MmdDataAdapter["create"]>[0]) {
    return row(
      await this.client.product.create({
        data: { ...input.data, sessionId: this.sessionId }
      })
    );
  }

  async update(input: Parameters<MmdDataAdapter["update"]>[0]) {
    const filter = { sessionId: this.sessionId, [input.key]: input.value };
    const existing = await this.client.product.findFirst({
      where: filter,
      select: { id: true }
    });
    const id = (existing as Row | null)?.id;
    if (typeof id !== "string") throw new Error("Record not found");
    return row(
      await this.client.product.update({
        where: { id, sessionId: this.sessionId },
        data: input.data
      })
    );
  }

  async remove(input: Parameters<MmdDataAdapter["remove"]>[0]) {
    const filter = { sessionId: this.sessionId, [input.key]: input.value };
    const existing = await this.client.product.findFirst({ where: filter });
    if (!existing) return null;
    await this.client.product.deleteMany({ where: filter });
    return row(existing);
  }
}
