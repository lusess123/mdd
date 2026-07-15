import { describe, expect, test } from "bun:test";
import {
  ModelFieldType,
  type ModelDefinition
} from "mmd-contracts";
import {
  MmdEngine,
  MmdRegistry,
  type AdapterCountInput,
  type AdapterCreateInput,
  type AdapterFindManyInput,
  type AdapterFindOneInput,
  type AdapterRemoveInput,
  type AdapterUpdateInput,
  type FilterExpression,
  type MmdDataAdapter
} from "../src/index";

type Row = Record<string, unknown>;

function matches(row: Row, filter?: FilterExpression): boolean {
  if (!filter) return true;
  if ("and" in filter) return filter.and.every((item) => matches(row, item));
  if ("or" in filter) return filter.or.some((item) => matches(row, item));
  const value = row[filter.field];
  switch (filter.operator) {
    case "contains":
      return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(value);
    case "gte":
      return Number(value) >= Number(filter.value);
    case "lte":
      return Number(value) <= Number(filter.value);
    default:
      return value === filter.value;
  }
}

class MemoryAdapter implements MmdDataAdapter {
  readonly rows: Row[];
  lastListInput?: AdapterFindManyInput;
  lastFindOneInput?: AdapterFindOneInput;
  lastCreateInput?: AdapterCreateInput;
  lastUpdateInput?: AdapterUpdateInput;
  lastRemoveInput?: AdapterRemoveInput;

  constructor(rows: Row[]) {
    this.rows = rows;
  }

  async findMany(input: AdapterFindManyInput): Promise<Row[]> {
    this.lastListInput = input;
    return this.rows
      .filter((row) => matches(row, input.filter))
      .slice(input.offset, input.offset + input.limit)
      .map((row) => Object.fromEntries(input.fields.map((field) => [field, row[field]])));
  }

  async count(input: AdapterCountInput): Promise<number> {
    return this.rows.filter((row) => matches(row, input.filter)).length;
  }

  async findOne(input: AdapterFindOneInput): Promise<Row | null> {
    this.lastFindOneInput = input;
    const row = this.rows.find((item) => item[input.key] === input.value);
    if (!row) return null;
    return Object.fromEntries(input.fields.map((field) => [field, row[field]]));
  }

  async create(input: AdapterCreateInput): Promise<Row> {
    this.lastCreateInput = input;
    const row = { id: `p${this.rows.length + 1}`, ...input.data };
    this.rows.push(row);
    return row;
  }

  async update(input: AdapterUpdateInput): Promise<Row> {
    this.lastUpdateInput = input;
    const index = this.rows.findIndex((item) => item[input.key] === input.value);
    if (index === -1) throw new Error("Not found");
    this.rows[index] = { ...this.rows[index], ...input.data };
    return this.rows[index]!;
  }

  async remove(input: AdapterRemoveInput): Promise<Row | null> {
    this.lastRemoveInput = input;
    const index = this.rows.findIndex((item) => item[input.key] === input.value);
    if (index === -1) return null;
    return this.rows.splice(index, 1)[0] ?? null;
  }
}

const productModel: ModelDefinition = {
  name: "Product",
  primaryKey: "id",
  fields: [
    { name: "id", fieldType: ModelFieldType.Key },
    { name: "name", fieldType: ModelFieldType.Text, required: true },
    { name: "status", fieldType: ModelFieldType.Single },
    { name: "price", fieldType: ModelFieldType.Number },
    { name: "updatedAt", fieldType: ModelFieldType.DateTime, readOnly: true }
  ],
  actions: [
    { name: "publish", label: "发布", type: "custom", placement: "bulk" }
  ]
};

function createEngine(
  rows: Row[] = [],
  actions?: ConstructorParameters<typeof MmdEngine>[0]["actions"]
) {
  const registry = new MmdRegistry().registerModel(productModel);
  const adapter = new MemoryAdapter(rows);
  return { engine: new MmdEngine({ registry, adapter, actions }), adapter };
}

describe("MmdEngine", () => {
  test("列表查询只生成已注册字段的安全过滤，并限制分页大小", async () => {
    const { engine, adapter } = createEngine([
      { id: "p1", name: "Alpha", status: "draft", price: 10 },
      { id: "p2", name: "Beta", status: "published", price: 20 }
    ]);

    const result = await engine.queryList({
      model: "Product",
      fields: ["name", "status"],
      page: 1,
      pageSize: 500,
      search: { name: "alp", status: ["draft"] },
      sort: [{ field: "price", direction: "asc" }]
    });

    expect(result).toEqual({
      data: [{ id: "p1", name: "Alpha", status: "draft" }],
      total: 1,
      page: 1,
      pageSize: 100
    });
    expect(adapter.lastListInput).toMatchObject({
      fields: ["id", "name", "status"],
      offset: 0,
      limit: 100,
      sort: [{ field: "price", direction: "asc" }]
    });
  });

  test("按模型主键查询单条记录，并限制返回字段", async () => {
    const { engine, adapter } = createEngine([
      { id: "p1", name: "Alpha", status: "draft", price: 10 }
    ]);

    const result = await engine.queryOne({
      model: "Product",
      id: "p1",
      fields: ["name"]
    });

    expect(result).toEqual({ id: "p1", name: "Alpha" });
    expect(adapter.lastFindOneInput).toMatchObject({
      key: "id",
      value: "p1",
      fields: ["id", "name"]
    });
  });

  test("新增和更新只把可写模型字段交给适配器", async () => {
    const { engine, adapter } = createEngine();

    const created = await engine.save({
      model: "Product",
      data: { name: "Alpha", status: "draft", price: 10 }
    });
    const updated = await engine.save({
      model: "Product",
      id: "p1",
      data: { name: "Alpha 2", price: 12 }
    });

    expect(created).toMatchObject({ id: "p1", name: "Alpha" });
    expect(updated).toMatchObject({ id: "p1", name: "Alpha 2", price: 12 });
    expect(adapter.lastCreateInput?.data).toEqual({
      name: "Alpha",
      status: "draft",
      price: 10
    });
    expect(adapter.lastUpdateInput?.data).toEqual({ name: "Alpha 2", price: 12 });
  });

  test("删除操作使用模型定义的主键", async () => {
    const { engine, adapter } = createEngine([{ id: "p1", name: "Alpha" }]);

    const removed = await engine.remove({ model: "Product", id: "p1" });

    expect(removed).toEqual({ id: "p1", name: "Alpha" });
    expect(adapter.lastRemoveInput).toMatchObject({ key: "id", value: "p1" });
    expect(adapter.rows).toHaveLength(0);
  });

  test("旧版 del 动作名继续执行内置删除", async () => {
    const { engine } = createEngine([{ id: "p1", name: "Alpha" }]);

    const result = await engine.executeAction({
      model: "Product",
      action: "del",
      ids: ["p1"]
    });

    expect(result).toMatchObject({ action: "del", affected: 1 });
  });

  test("只执行模型声明且已注册的自定义动作", async () => {
    const { engine } = createEngine(
      [{ id: "p1", name: "Alpha", status: "draft", price: 10 }],
      {
        "Product.publish": async ({ ids, engine: actionEngine }) => ({
          data: await Promise.all(
            ids.map((id) =>
              actionEngine.save({
                model: "Product",
                id,
                data: { status: "published" }
              })
            )
          )
        })
      }
    );

    const result = await engine.executeAction({
      model: "Product",
      action: "publish",
      ids: ["p1"]
    });

    expect(result).toEqual({
      action: "publish",
      affected: 1,
      data: [
        { id: "p1", name: "Alpha", status: "published", price: 10 }
      ]
    });
  });

  test("拒绝未声明字段、越权写入和不匹配的过滤操作", async () => {
    const { engine } = createEngine();

    await expect(
      engine.queryList({ model: "Product", search: { password: "x" } })
    ).rejects.toMatchObject({ code: "FIELD_NOT_FOUND" });
    await expect(
      engine.queryList({
        model: "Product",
        filters: [{ field: "price", operator: "contains", value: "1" }]
      })
    ).rejects.toMatchObject({ code: "INVALID_FILTER" });
    await expect(
      engine.save({
        model: "Product",
        data: { name: "Alpha", updatedAt: "2026-07-14" }
      })
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("无效分页值回退到稳定默认值", async () => {
    const { engine } = createEngine();

    const result = await engine.queryList({
      model: "Product",
      page: Number.NaN,
      pageSize: Number.POSITIVE_INFINITY
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});
