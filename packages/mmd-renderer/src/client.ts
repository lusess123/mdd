import type {
  MetaQuery,
  MmdClient,
  MmdListInput,
  MmdListResult,
  MmdRecord,
  RendererDictionary,
  RendererMeta,
  RendererModel,
  RendererView,
} from "./types";

export type MmdRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export interface MmdApiPaths {
  meta: string;
  list: string;
  get: string;
  save: string;
  remove: string;
  action: (name: string) => string;
}

export const defaultMmdApiPaths: MmdApiPaths = {
  meta: "/mmd/meta",
  list: "/mmd/query-list",
  get: "/mmd/query-one",
  save: "/mmd/save",
  remove: "/mmd/remove",
  action: (name) => `/mmd/actions/${encodeURIComponent(name)}`,
};

function post<T>(request: MmdRequest, path: string, input: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(input) });
}

function unwrapData<T>(value: T | { data: T }): T {
  return value && typeof value === "object" && "data" in value
    ? (value as { data: T }).data
    : value;
}

function byName<T extends { name: string }>(
  value: T[] | Record<string, T> | undefined,
): Record<string, T> {
  if (!value) return {};
  if (!Array.isArray(value)) return value;
  return Object.fromEntries(value.map((item) => [item.name, item]));
}

function normalizeMeta(raw: unknown): RendererMeta {
  const value = unwrapData(raw as RendererMeta | { data: RendererMeta });
  return {
    models: byName(
      (value as { models?: RendererModel[] | Record<string, RendererModel> }).models,
    ),
    views: byName(
      (value as { views?: RendererView[] | Record<string, RendererView> }).views,
    ),
    dicts:
      (value as { dicts?: Record<string, RendererDictionary> }).dicts ?? {},
  };
}

function normalizeList(raw: unknown, input: MmdListInput): MmdListResult {
  const outer = raw as {
    data?: unknown;
    rows?: MmdRecord[];
    list?: MmdRecord[];
    total?: number;
    count?: number;
    page?: number;
    pageSize?: number;
  };
  const nested =
    outer.data && !Array.isArray(outer.data) && typeof outer.data === "object"
      ? (outer.data as typeof outer)
      : outer;
  const rows =
    nested.rows ??
    nested.list ??
    (Array.isArray(nested.data) ? (nested.data as MmdRecord[]) : []);

  return {
    rows,
    total: nested.total ?? nested.count ?? rows.length,
    page: nested.page ?? input.page ?? 1,
    pageSize: nested.pageSize ?? input.pageSize ?? 20,
  };
}

export function createHttpMmdClient(
  request: MmdRequest,
  pathOverrides: Partial<MmdApiPaths> = {},
): MmdClient {
  const paths = { ...defaultMmdApiPaths, ...pathOverrides };
  return {
    async getMeta(input: MetaQuery) {
      return normalizeMeta(await post(request, paths.meta, input));
    },
    async list(input) {
      return normalizeList(await post(request, paths.list, input), input);
    },
    async get(input) {
      return unwrapData(
        await post<MmdRecord | null | { data: MmdRecord | null }>(
          request,
          paths.get,
          input,
        ),
      );
    },
    async save(input) {
      const { row, ...requestInput } = input;
      return unwrapData(
        await post<MmdRecord | { data: MmdRecord }>(request, paths.save, {
          ...requestInput,
          data: row,
        }),
      );
    },
    async remove(input) {
      const raw = await post<
        | { affected: number }
        | { data: { affected: number } }
        | { success: boolean }
      >(request, paths.remove, input);
      const value = unwrapData(raw as { affected: number } | { data: { affected: number } });
      return {
        affected:
          "affected" in value
            ? value.affected
            : (raw as { success?: boolean }).success
              ? input.ids.length
              : 0,
      };
    },
    async executeAction(input) {
      const { url, method: inputMethod, row, payload, ...requestInput } = input;
      const body = {
        ...requestInput,
        payload: payload ?? row,
      };
      if (url) {
        const method = inputMethod?.toUpperCase() ?? "POST";
        if (method === "GET") {
          const query = new URLSearchParams({ model: input.model });
          for (const id of input.ids ?? []) query.append("ids", id);
          return request(`${url}?${query}`, { method });
        }
        return request(url, {
          method,
          body: JSON.stringify(body),
        });
      }
      const raw = await post<unknown>(request, paths.action(input.action), body);
      return unwrapData(raw as unknown | { data: unknown });
    },
  };
}
