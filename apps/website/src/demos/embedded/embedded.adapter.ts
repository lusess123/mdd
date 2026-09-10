import type { FilterExpression, MmdDataAdapter } from "mmd-engine";
import type { MmdRecord } from "mmd-renderer";

/** 演示适配器仅存内存，不用于生产数据库或鉴权。 */
export function createDemoAdapter(): MmdDataAdapter {
  const tables: Record<string, MmdRecord[]> = {
    Category: [
      { id: "category-1", name: "Studio" },
      { id: "category-2", name: "Outdoor" },
      ...Array.from({ length: 22 }, (_, index) => ({
        id: `category-${index + 3}`,
        name: `Category ${String(index + 3).padStart(2, "0")}`,
      })),
    ],
    Item: Array.from({ length: 24 }, (_, index) => ({
      id: `item-${index + 1}`,
      name: `Sample ${String(index + 1).padStart(2, "0")}`,
      categoryId: index < 22 ? "category-1" : "category-2",
      notes: '{"source":"demo"}',
      status: [0, "0", false][index % 3],
      active: index % 2 === 0,
      amount: index === 0 ? "9007199254740993.0100" : `${index + 1}.50`,
      createdAt: "2026-09-01T08:30:00.000Z",
    })),
  };
  const rows = (name: string) => {
    const table = tables[name];
    if (!table) throw new Error(`Unknown demo model: ${name}`);
    return table;
  };
  const select = (row: MmdRecord, fields: string[]) =>
    Object.fromEntries(fields.map((field) => [field, row[field]]));
  return {
    async findMany(input) {
      return rows(input.model.name)
        .filter((row) => matches(row, input.filter))
        .sort((a, b) => {
          for (const sort of input.sort) {
            const compared = compare(a[sort.field], b[sort.field]);
            if (compared)
              return compared * (sort.direction === "desc" ? -1 : 1);
          }
          return 0;
        })
        .slice(input.offset, input.offset + input.limit)
        .map((row) => select(row, input.fields));
    },
    async count(input) {
      return rows(input.model.name).filter((row) => matches(row, input.filter))
        .length;
    },
    async findOne(input) {
      const row = rows(input.model.name).find(
        (row) => row[input.key] === input.value,
      );
      return row ? select(row, input.fields) : null;
    },
    async create(input) {
      const row = {
        ...input.data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      rows(input.model.name).unshift(row);
      return { ...row };
    },
    async update(input) {
      const row = rows(input.model.name).find(
        (row) => row[input.key] === input.value,
      );
      if (!row) throw new Error("Record not found");
      Object.assign(row, input.data);
      return { ...row };
    },
    async remove(input) {
      const table = rows(input.model.name);
      const index = table.findIndex((row) => row[input.key] === input.value);
      return index < 0 ? null : (table.splice(index, 1)[0] ?? null);
    },
  };
}

function compare(left: unknown, right: unknown) {
  const a = String(left ?? ""),
    b = String(right ?? "");
  if (/^-?\d+(\.\d+)?$/.test(a) && /^-?\d+(\.\d+)?$/.test(b)) {
    const scale = Math.max(
      a.split(".")[1]?.length ?? 0,
      b.split(".")[1]?.length ?? 0,
    );
    const integer = (value: string) => {
      const [whole = "0", fraction = ""] = value.split(".");
      return BigInt(whole + fraction.padEnd(scale, "0"));
    };
    return integer(a) < integer(b) ? -1 : integer(a) > integer(b) ? 1 : 0;
  }
  return a.localeCompare(b);
}
function matches(row: MmdRecord, filter?: FilterExpression): boolean {
  if (!filter) return true;
  if ("and" in filter) return filter.and.every((item) => matches(row, item));
  if ("or" in filter) return filter.or.some((item) => matches(row, item));
  const value = row[filter.field];
  switch (filter.operator) {
    case "eq":
      return value === filter.value;
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(value);
    case "contains":
      return String(value ?? "")
        .toLowerCase()
        .includes(String(filter.value).toLowerCase());
    case "gte":
      return compare(value, filter.value) >= 0;
    case "lte":
      return compare(value, filter.value) <= 0;
  }
}
