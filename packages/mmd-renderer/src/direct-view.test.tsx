import { expect, test } from "bun:test";
import {
  createBrowserListQueryState,
  createBrowserTabState,
  parseListQuery,
} from "./navigation/query-state";
import { initialFormValues } from "./form-values";
import { createDefaultActionRegistry } from "./action-registry";
import { createHttpMmdClient, type MmdRequest } from "./client";
import type { OpenViewInput } from "./types";

test("canonical HTTP list payload keeps typed relation values and separate search", async () => {
  let body: unknown;
  const request = (async (_path: string, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return { rows: [], total: 0 };
  }) as MmdRequest;
  await createHttpMmdClient(request).list({
    model: "children",
    where: { parentId: "p", active: false, rank: 0, state: [0, "0"] },
    search: { name: "partial" },
  });
  expect(body).toEqual({
    model: "children",
    search: { name: "partial" },
    filters: [
      { field: "parentId", operator: "eq", value: "p" },
      { field: "active", operator: "eq", value: false },
      { field: "rank", operator: "eq", value: 0 },
      { field: "state", operator: "in", value: [0, "0"] },
    ],
  });
});

test("URL lists preserve independent tabs, defaults, typed values, hash and history state", () => {
  const descriptors = new Map(
    ["location", "history"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  let url = new URL(
    "https://example.test/record/1?query=%7B%22page%22%3A4%7D#section",
  );
  const state = { returnTrail: ["/list"] };
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    get: () => url,
  });
  Object.defineProperty(globalThis, "history", {
    configurable: true,
    value: {
      state,
      replaceState(next: unknown, _title: string, path: string) {
        expect(next).toBe(state);
        url = new URL(path, url);
      },
    },
  });
  try {
    const list = createBrowserListQueryState({
      key: "relatedQuery.children.parentId",
      initial: { sort: [{ field: "name", direction: "asc" }] },
      sortOptions: [{ sort: [{ field: "name", direction: "asc" }] }],
    });
    const tab = createBrowserTabState();
    tab.write("children:parentId");
    list.write({
      ...list.read(),
      page: 3,
      search: {
        active: false,
        state: [0, "0"],
        amount: ["9007199254740993", null],
      },
    });
    expect(list.read().page).toBe(3);
    expect(list.read().search.state).toEqual([0, "0"]);
    expect(createBrowserListQueryState().read().page).toBe(4);
    expect(tab.read()).toBe("children:parentId");
    expect(url.hash).toBe("#section");
    url.searchParams.set(
      "relatedQuery.children.parentId",
      JSON.stringify({ sort: [{ field: "secret", direction: "asc" }] }),
    );
    expect(list.read().page).toBe(1);
    url.searchParams.set("relatedQuery.children.parentId", "broken");
    expect(list.read().sort).toEqual([{ field: "name", direction: "asc" }]);
    expect(() => parseListQuery({ pageSize: 1000 })).toThrow();
    expect(() => parseListQuery({ search: [] })).toThrow();
  } finally {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test("new defaults are restricted to writable fields and default new navigation carries them", async () => {
  const defaults = initialFormValues({
    fields: [
      { name: "id", defaultValue: "generated", readOnly: true },
      { name: "parentId" },
      { name: "active", defaultValue: true },
      { name: "version", readOnly: true },
    ],
    keyField: "id",
    defaults: {
      id: "injected",
      parentId: "p",
      active: false,
      version: "tampered",
      secret: 1,
    },
  });
  expect(defaults).toEqual({ id: "generated", parentId: "p", active: false });
  let opened: OpenViewInput | undefined;
  const client = createHttpMmdClient((async () => ({})) as MmdRequest);
  await createDefaultActionRegistry().execute(
    { type: "new", label: "New" },
    {
      model: "children",
      record: defaults,
      client,
      openView: (value) => {
        opened = value;
      },
    },
  );
  expect(opened?.view).toBe("newview");
  expect(opened?.id).toBeUndefined();
  expect(opened?.defaults?.parentId).toBe("p");
});
