import type { MmdClient, MmdListInput, MmdRecord } from "./types";

/** 关联查询的公开模型信息；权限由 client 对应的服务端强制校验。 */
export interface ReferenceResource {
  /** 模型名称。 */
  name: string;
  /** 无业务名称时的显示标签。 */
  label?: string;
  /** 主键字段名，默认 id；支持字符串和数字主键。 */
  primaryKey?: string;
  /** 用于名称搜索和展示的字段，默认主键。 */
  displayField?: string;
}

/** 每个 Provider/登录会话独享实例；合并同轮名称请求，不缓存网络错误。 */
export function createReferenceData({
  client, resources, pageSize = 20, batchSize = 100, searchQuery,
}: {
  client: Pick<MmdClient, "list">;
  resources: readonly ReferenceResource[];
  pageSize?: number;
  batchSize?: number;
  /** 自定义 ID 识别/搜索策略；返回 null 表示不发请求。 */
  searchQuery?: (input: { resource: ReferenceResource; term: string }) =>
    Pick<MmdListInput, "where" | "search"> | null;
}) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(batchSize) || batchSize < 1)
    throw new Error("Reference pageSize and batchSize must be positive integers");
  const registry = new Map(resources.map((resource) => [resource.name, resource]));
  type Entry = {
    /** 同批共享的 Promise。 */
    promise: Promise<string | null>;
    /** null 表示当前不可见或已删除。 */
    resolve: (label: string | null) => void;
    /** 失败不缓存，可重试。 */
    reject: (error: unknown) => void;
  };
  function createCache() {
    return {
      /** 当前代名称缓存，与旧请求完全隔离。 */
      labels: new Map<string, string | null>(),
      /** 模型和编号使用 JSON 元组编码，避免分隔符碰撞。 */
      pending: new Map<string, Entry>(),
      /** 下一轮待发送的模型批次。 */
      batches: new Map<string, Map<string, Entry>>(),
    };
  }
  let cache = createCache();
  let revision = 0;
  const listeners = new Set<() => void>();
  const getSnapshot = () => revision;
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
  const keyOf = (model: string, id: string) => JSON.stringify([model, id]);
  function labelFor(resource: ReferenceResource, row: MmdRecord) {
    const id = String(row[resource.primaryKey ?? "id"] ?? "");
    const label = row[resource.displayField ?? resource.primaryKey ?? "id"];
    return label !== null && label !== undefined && String(label).trim() && String(label) !== id
      ? String(label) : `${resource.label ?? resource.name} · ${id.slice(-8)}`;
  }
  async function flush(model: string, owner: ReturnType<typeof createCache>) {
    const batch = owner.batches.get(model);
    const resource = registry.get(model);
    if (!batch || !resource) return;
    owner.batches.delete(model);
    const ids = [...batch.keys()];
    const primaryKey = resource.primaryKey ?? "id";
    try {
      for (let offset = 0; offset < ids.length; offset += batchSize) {
        const chunk = ids.slice(offset, offset + batchSize);
        const result = await client.list({ model, fields: [...new Set([primaryKey, resource.displayField ?? primaryKey])],
          where: { [primaryKey]: chunk }, page: 1, pageSize: batchSize });
        const found = new Map(result.rows.map((row) => [String(row[primaryKey]), labelFor(resource, row)]));
        for (const id of chunk) {
          const label = found.get(id) ?? null;
          owner.labels.set(keyOf(model, id), label);
          batch.get(id)?.resolve(label);
        }
      }
    } catch (error) {
      for (const entry of batch.values()) entry.reject(error);
    } finally {
      for (const id of ids) owner.pending.delete(keyOf(model, id));
    }
  }
  function resolve({ model, id }: { model: string; id: string }): Promise<string | null> {
    const owner = cache;
    const key = keyOf(model, id);
    if (!registry.has(model)) return Promise.resolve(null);
    if (owner.labels.has(key)) return Promise.resolve(owner.labels.get(key) ?? null);
    const current = owner.pending.get(key);
    if (current) return current.promise;
    let complete: Entry["resolve"] = () => {};
    let fail: Entry["reject"] = () => {};
    const promise = new Promise<string | null>((resolve, reject) => { complete = resolve; fail = reject; });
    const entry: Entry = { promise, resolve: complete, reject: fail };
    let batch = owner.batches.get(model);
    if (!batch) {
      batch = new Map();
      owner.batches.set(model, batch);
      setTimeout(() => void flush(model, owner), 0);
    }
    batch.set(id, entry);
    owner.pending.set(key, entry);
    return promise;
  }
  async function search({ model, term, page }: { model: string; term: string; page: number }) {
    const owner = cache;
    const resource = registry.get(model);
    if (!resource) throw new Error("Related resource is not available");
    const primaryKey = resource.primaryKey ?? "id";
    const displayField = resource.displayField ?? primaryKey;
    const keyword = term.trim();
    const query = searchQuery ? searchQuery({ resource, term: keyword })
      : !keyword ? {} : displayField === primaryKey
        ? { where: { [primaryKey]: keyword } } : { search: { [displayField]: keyword } };
    if (query === null) return { options: [], total: 0 };
    const result = await client.list({ model, fields: [...new Set([primaryKey, displayField])],
      page, pageSize, ...query });
    const options = result.rows.flatMap((row) => {
      const id = row[primaryKey];
      if (typeof id !== "string" && typeof id !== "number") return [];
      const label = labelFor(resource, row);
      owner.labels.set(keyOf(model, String(id)), label);
      return [{ value: String(id), label }];
    });
    return { options, total: result.total };
  }
  function invalidate() { cache = createCache(); revision++; for (const listener of listeners) listener(); }
  return { resolve, search, invalidate, pageSize, subscribe, getSnapshot };
}
