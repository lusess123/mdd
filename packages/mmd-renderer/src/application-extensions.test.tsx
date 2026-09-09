import { expect, test } from "bun:test";
import {
  createUrlQueryState,
  normalizeListSearch,
} from "./navigation/query-state";
import { createNavigationTrail } from "./navigation/navigation-trail";
import { createChangeGuard } from "./lifecycle/change-guard";
import {
  withClientLifecycle,
  createRecordVersionStore,
  MmdCancelledError,
} from "./lifecycle/client-lifecycle";
import {
  mapMetadataFields,
  withReadonlyIdentifier,
} from "./lifecycle/metadata-fields";
import {
  relatedListContext,
  type RelationResource,
} from "./relations/related-records";
import { applicationMenu } from "./shell/application-shell";
import type { MmdClient, RendererMeta } from "./types";

function clientFixture() {
  const writes: string[] = [];
  const client: MmdClient = {
    getMeta: async () => ({ models: {}, views: {}, dicts: {} }),
    list: async () => ({ rows: [], total: 0, page: 1, pageSize: 20 }),
    get: async () => null,
    save: async (input) => {
      writes.push("save");
      return input.row;
    },
    remove: async () => {
      writes.push("remove");
      return { affected: 1 };
    },
    executeAction: async () => {
      writes.push("action");
      return {};
    },
  };
  return { client, writes };
}

test("URL state isolates keys, preserves false/0/decimal ranges and rejects malformed data", () => {
  let search = "?other=kept&query=broken";
  const state = createUrlQueryState({
    readSearch: () => search,
    replaceSearch: (value) => {
      search = value;
    },
    initial: () => ({ page: 1 }),
    parse: (value) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("page" in value) ||
        typeof value.page !== "number"
      )
        throw new Error();
      return { page: value.page };
    },
  });
  expect(state.read()).toEqual({ page: 1 });
  state.write({ page: 3 });
  expect(state.read()).toEqual({ page: 3 });
  expect(new URLSearchParams(search).get("other")).toBe("kept");
  const tab = createUrlQueryState({
    key: "related",
    readSearch: () => search,
    replaceSearch: (value) => {
      search = value;
    },
    initial: () => "",
    parse: (value) => {
      if (typeof value !== "string") throw new Error();
      return value;
    },
    serialize: (value) => value,
    deserialize: (value) => value,
  });
  tab.write("child:parentId");
  expect(tab.read()).toBe("child:parentId");
  expect(state.read()).toEqual({ page: 3 });
  expect(
    normalizeListSearch({
      fields: ["flag", "zero", "range", "empty"],
      values: {
        flag: false,
        zero: 0,
        range: ["9007199254740993", null],
        empty: [null, ""],
        hidden: "x",
      },
    }),
  ).toEqual({ flag: false, zero: 0, range: ["9007199254740993", null] });
});

test("return trail preserves unrelated history state, bounds history and rejects external destinations", () => {
  let current = {
    path: "/items/list?query=1",
    state: { scroll: 45, returnTrail: ["https://outside.test"] },
  };
  const nav = createNavigationTrail({
    read: () => current,
    push: (value) => {
      current = value as typeof current;
    },
    isResource: (path) => path.startsWith("/items/"),
    notify: () => {},
    limit: 2,
  });
  nav.navigate("/items/one");
  nav.navigate("/items/two");
  nav.back("/items/list");
  expect(current.path).toBe("/items/one");
  expect(current.state.scroll).toBe(45);
  nav.back("/items/list");
  expect(current.path).toBe("/items/list?query=1");
  nav.back("/items/list");
  expect(current.path).toBe("/items/list");
});

test("mutation hooks transform input, cancel without writes and invalidate only after success", async () => {
  const fixture = clientFixture();
  const events: string[] = [];
  const wrapped = withClientLifecycle({
    client: fixture.client,
    before: {
      save: (input) => ({ ...input, row: { allowed: input.row.allowed } }),
      remove: () => null,
    },
    afterMutation: (event) => {
      events.push(event.operation);
    },
  });
  expect(
    await wrapped.save({ model: "x", row: { allowed: false, secret: true } }),
  ).toEqual({ allowed: false });
  await expect(
    wrapped.remove({ model: "x", ids: ["1"] }),
  ).rejects.toBeInstanceOf(MmdCancelledError);
  expect(fixture.writes).toEqual(["save"]);
  expect(events).toEqual(["save"]);
  const failed = withClientLifecycle({
    client: {
      ...fixture.client,
      save: async () => {
        throw new Error("conflict");
      },
    },
    afterMutation: () => {
      events.push("bad");
    },
  });
  await expect(failed.save({ model: "x", row: {} })).rejects.toThrow(
    "conflict",
  );
  expect(events).toEqual(["save"]);
});

test("versions use collision-free model/id keys, remain request-local and clear on session end", () => {
  const versions = createRecordVersionStore({ header: "X-Version" });
  versions.capture({ model: "a:b", id: "c", version: "one" });
  versions.capture({ model: "a", id: "b:c", version: "two" });
  const previous = versions.headers({ model: "a:b", id: "c" });
  versions.capture({ model: "a:b", id: "c", version: "three" });
  expect(previous).toEqual({ "X-Version": "one" });
  expect(versions.headers({ model: "a", id: "b:c" })).toEqual({
    "X-Version": "two",
  });
  versions.clear();
  expect(versions.headers({ model: "a", id: "b:c" })).toEqual({
    "X-Version": "",
  });
});

test("change guard tracks independent forms, handles cancellation and deduplicates pending confirmations", async () => {
  const guard = createChangeGuard();
  let committed = 0;
  let complete = (_value: boolean) => {};
  guard.setDirty({ id: "a", value: true });
  guard.setDirty({ id: "b", value: true });
  guard.setDirty({ id: "a", value: false });
  expect(guard.hasChanges()).toBe(true);
  const pending = guard.request({
    confirm: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
    commit: () => {
      committed++;
    },
  });
  expect(
    await guard.request({
      confirm: async () => true,
      commit: () => {
        committed++;
      },
    }),
  ).toBe(false);
  complete(false);
  expect(await pending).toBe(false);
  expect(committed).toBe(0);
  guard.setDirty({ id: "b", value: false });
  expect(
    await guard.request({
      confirm: async () => {
        throw new Error("pristine must not prompt");
      },
      commit: () => {
        committed++;
      },
    }),
  ).toBe(true);
  expect(committed).toBe(1);
});

test("metadata mapping covers model, view and search without mutating input", () => {
  const original: RendererMeta = {
    models: {
      Product: { name: "Product", fields: [{ name: "id", readOnly: false }] },
    },
    views: {
      list: {
        name: "list",
        type: "list",
        dataContainers: [
          {
            name: "Product",
            type: "list",
            fields: [{ name: "id" }],
            search: { fields: [{ name: "id" }] },
          },
        ],
      },
    },
    dicts: {},
  };
  original.models.Product!.fieldsObject = { id: { name: "id", readOnly: false } };
  const result = mapMetadataFields({
    meta: original,
    map: withReadonlyIdentifier,
  });
  expect(result.models.Product?.fields[0]?.readOnly).toBe(true);
  expect(result.models.Product?.fieldsObject?.id?.readOnly).toBe(true);
  expect(original.models.Product?.fieldsObject?.id?.readOnly).toBe(false);
  expect(
    result.views.list?.dataContainers[0]?.search?.fields[0]?.readOnly,
  ).toBe(false);
  expect(original.models.Product?.fields[0]?.readOnly).toBe(false);
});

test("related defaults match conditional targets and fixed parent constraints always win", () => {
  const resource: RelationResource = {
    name: "parents",
    references: [
      {
        field: "owner",
        target: "users",
        when: { field: "kind", value: "user" },
      },
    ],
    children: [],
  };
  const target: RelationResource = {
    name: "children",
    references: [{ field: "owner", target: "users" }],
    children: [],
  };
  const relation = {
    model: "children",
    field: "parentId",
    label: "Children",
    filter: { parentId: "wrong", status: "active" },
  };
  expect(
    relatedListContext({
      resource,
      target,
      relation,
      id: "actual",
      record: { kind: "user", owner: "u" },
    }).defaults,
  ).toEqual({ owner: "u", parentId: "actual", status: "active" });
  expect(
    relatedListContext({
      resource,
      target,
      relation,
      id: "actual",
      record: { kind: "team", owner: "u" },
    }).defaults,
  ).toEqual({ parentId: "actual", status: "active" });
});

test("menu groups and resource names cannot collide, search includes model and group labels", () => {
  const items = [
    {
      key: "users",
      label: "User",
      group: { key: "users", label: "Customers" },
    },
    { key: "overview", label: "Overview" },
  ];
  expect(
    applicationMenu({ items, search: "" }).map((item) => item.key),
  ).toEqual(["group:users", "item:overview"]);
  expect(
    applicationMenu({ items, search: "CUSTOMERS" })[0]?.children?.[0]?.key,
  ).toBe("item:users");
  expect(applicationMenu({ items, search: "missing" })).toEqual([]);
});
