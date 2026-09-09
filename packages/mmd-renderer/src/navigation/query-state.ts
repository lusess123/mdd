import type { MmdListInput, MmdRecord } from "../types";

export interface ListQuery {
  /** 已应用的查询值，不包含输入中的草稿。 */
  search: MmdRecord;
  /** 有序排序条件，字段白名单由宿主或后端控制。 */
  sort: NonNullable<MmdListInput["sort"]>;
  /** 从 1 开始的请求页。 */
  page: number;
  /** 每页数量。 */
  pageSize: number;
}
export interface QueryState<T> {
  read(): T;
  write(value: T): void;
  /** 可选的外部导航通知；返回取消订阅函数。 */
  subscribe?: (listener: () => void) => () => void;
}

/** 每个参数键独立保存；宿主负责 URL、history.state 和路由器的实际读写。 */
export function createUrlQueryState<T>({
  key = "query",
  initial,
  parse,
  readSearch,
  replaceSearch,
  subscribe,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
}: {
  /** 标量标签页可用原文编解码，其余默认 JSON。 */
  serialize?: (value: T) => string;
  deserialize?: (value: string) => unknown;
  key?: string;
  initial: () => T;
  parse: (value: unknown) => T;
  readSearch: () => string;
  replaceSearch: (search: string) => void;
  subscribe?: QueryState<T>["subscribe"];
}): QueryState<T> {
  return {
    read() {
      try {
        const value = new URLSearchParams(readSearch()).get(key);
        return value === null ? initial() : parse(deserialize(value));
      } catch {
        return initial();
      }
    },
    write(value) {
      const params = new URLSearchParams(readSearch());
      params.set(key, serialize(parse(value)));
      replaceSearch(`?${params}`);
    },
    ...(subscribe ? { subscribe } : {}),
  };
}

/** 筛选白名单与空区间清理；false、0、精确字符串原样保留。 */
export function normalizeListSearch({
  values,
  fields,
}: {
  values: MmdRecord;
  fields: readonly string[];
}) {
  const allowed = new Set(fields);
  const empty = (value: unknown) =>
    value === undefined || value === null || value === "";
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) =>
        allowed.has(key) &&
        !empty(value) &&
        !(Array.isArray(value) && value.every(empty)),
    ),
  );
}
