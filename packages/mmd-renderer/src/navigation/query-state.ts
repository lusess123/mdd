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

/** 内嵌页面的实例级查询状态，不读写 URL。 */
export function createMemoryQueryState<T>(initial: T): QueryState<T> {
  let value = initial;
  return { read: () => value, write: (next) => { value = next; } };
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

/** 标准列表 URL 编解码：分页校验、排序白名单与独立参数键由组件负责。 */
export function parseListQuery(
  value: unknown,
  initial: Partial<ListQuery> = {},
): ListQuery {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid list query");
  const input = value as Partial<ListQuery>;
  const result = {
    search: {},
    sort: [],
    page: 1,
    pageSize: 20,
    ...initial,
    ...input,
  };
  if (
    !result.search ||
    typeof result.search !== "object" ||
    Array.isArray(result.search) ||
    !Number.isInteger(result.page) ||
    result.page < 1 ||
    !Number.isInteger(result.pageSize) ||
    result.pageSize < 1 ||
    result.pageSize > 100 ||
    !Array.isArray(result.sort) ||
    result.sort.some(
      (item) =>
        !item ||
        typeof item.field !== "string" ||
        !["asc", "desc"].includes(item.direction),
    )
  )
    throw new Error("Invalid list query");
  return result;
}

/** 仅调用 read/write 时访问浏览器；SSR 导入安全。保留 hash、history.state 和其它参数。 */
export function createBrowserListQueryState({
  key = "query",
  initial = {},
  sortOptions,
}: {
  key?: string;
  initial?: Partial<ListQuery>;
  sortOptions?: Array<{ sort: ListQuery["sort"] }>;
} = {}): QueryState<ListQuery> {
  return createUrlQueryState({
    key,
    initial: () => parseListQuery({}, initial),
    parse: (value) => {
      const query = parseListQuery(value, initial);
      if (
        sortOptions &&
        query.sort.length &&
        !sortOptions.some(
          (option) =>
            JSON.stringify(option.sort) === JSON.stringify(query.sort),
        )
      )
        throw new Error("Unsupported sort");
      return query;
    },
    readSearch: () => (typeof location === "undefined" ? "" : location.search),
    replaceSearch: (search) => {
      if (typeof history !== "undefined")
        history.replaceState(
          history.state,
          "",
          `${location.pathname}${search}${location.hash}`,
        );
    },
    subscribe: (listener) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("popstate", listener);
      return () => window.removeEventListener("popstate", listener);
    },
  });
}

export function createBrowserTabState(key = "related"): QueryState<string> {
  return createUrlQueryState({
    key,
    initial: () => "",
    parse: (value) => (typeof value === "string" ? value : ""),
    serialize: (value) => value,
    deserialize: (value) => value,
    readSearch: () => (typeof location === "undefined" ? "" : location.search),
    replaceSearch: (search) => {
      if (typeof history !== "undefined")
        history.replaceState(
          history.state,
          "",
          `${location.pathname}${search}${location.hash}`,
        );
    },
  });
}
