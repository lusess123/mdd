import type { Product } from "mmd-contracts";
import type {
  FilterExpression,
  MmdDataAdapter,
  SortDefinition
} from "mmd-engine";

export const seededProducts: Product[] = [
  {
    id: "product-1001",
    name: "Aurora Desk Lamp",
    sku: "LAMP-001",
    cover:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=128&h=128&q=80",
    price: 129.99,
    tags: ["lighting", "workspace"],
    status: "draft",
    inventory: 24,
    createdAt: "2026-07-12T08:00:00.000Z",
    updatedAt: "2026-07-12T08:00:00.000Z"
  },
  {
    id: "product-1002",
    name: "Orbit Mechanical Keyboard",
    sku: "KEY-002",
    cover:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=128&h=128&q=80",
    price: 189,
    tags: ["keyboard", "workspace"],
    status: "published",
    inventory: 12,
    createdAt: "2026-07-11T08:00:00.000Z",
    updatedAt: "2026-07-13T08:00:00.000Z"
  },
  {
    id: "product-1003",
    name: "Slate Grid Notebook",
    sku: "NOTE-003",
    cover:
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=128&h=128&q=80",
    price: 18.5,
    tags: ["stationery"],
    status: "archived",
    inventory: 0,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-14T08:00:00.000Z"
  }
];

type Row = Record<string, unknown>;

function clone<T extends Row>(row: T): T {
  return structuredClone(row);
}

function matches(row: Row, expression?: FilterExpression): boolean {
  if (!expression) return true;
  if ("and" in expression) return expression.and.every((item) => matches(row, item));
  if ("or" in expression) return expression.or.some((item) => matches(row, item));

  const actual = row[expression.field];
  const expected = expression.value;
  switch (expression.operator) {
    case "eq":
      return actual === expected;
    case "contains":
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual ?? "").toLowerCase().includes(String(expected).toLowerCase());
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "gte":
      return compareValue(actual, expected) >= 0;
    case "lte":
      return compareValue(actual, expected) <= 0;
  }
}

function compareValue(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left ?? "").localeCompare(String(right ?? ""));
}

function compare(left: Row, right: Row, sort: SortDefinition[]): number {
  for (const item of sort) {
    const direction = item.direction === "desc" ? -1 : 1;
    if (left[item.field] === right[item.field]) continue;
    return compareValue(left[item.field], right[item.field]) * direction;
  }
  return 0;
}

function select(row: Row, fields: string[]): Row {
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

export class MemoryProductAdapter implements MmdDataAdapter {
  readonly #rows: Row[];

  constructor(rows: Product[] = seededProducts) {
    this.#rows = rows.map((row) => clone(row as unknown as Row));
  }

  async findMany(input: Parameters<MmdDataAdapter["findMany"]>[0]) {
    return this.#rows
      .filter((row) => matches(row, input.filter))
      .sort((left, right) => compare(left, right, input.sort))
      .slice(input.offset, input.offset + input.limit)
      .map((row) => select(clone(row), input.fields));
  }

  async count(input: Parameters<MmdDataAdapter["count"]>[0]) {
    return this.#rows.filter((row) => matches(row, input.filter)).length;
  }

  async findOne(input: Parameters<MmdDataAdapter["findOne"]>[0]) {
    const row = this.#rows.find((candidate) => candidate[input.key] === input.value);
    return row ? select(clone(row), input.fields) : null;
  }

  async create(input: Parameters<MmdDataAdapter["create"]>[0]) {
    const timestamp = new Date().toISOString();
    const row: Row = {
      id: `product-${crypto.randomUUID()}`,
      cover: "",
      tags: [],
      status: "draft",
      ...input.data,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.#rows.unshift(row);
    return clone(row);
  }

  async update(input: Parameters<MmdDataAdapter["update"]>[0]) {
    const index = this.#rows.findIndex((row) => row[input.key] === input.value);
    if (index === -1) throw new Error("Record not found");
    const row = {
      ...this.#rows[index],
      ...input.data,
      updatedAt: new Date().toISOString()
    };
    this.#rows[index] = row;
    return clone(row);
  }

  async remove(input: Parameters<MmdDataAdapter["remove"]>[0]) {
    const index = this.#rows.findIndex((row) => row[input.key] === input.value);
    if (index === -1) return null;
    return clone(this.#rows.splice(index, 1)[0]!);
  }
}
