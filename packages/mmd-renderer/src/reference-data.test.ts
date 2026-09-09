import { expect, test } from "bun:test";
import { createReferenceData } from "./reference-data";
import { referenceContext } from "./reference-field";
import type { MmdListInput, MmdListResult, RendererField } from "./types";

const resources = [{ name: "people", primaryKey: "code", displayField: "name" }];
const result = (rows: MmdListResult["rows"]): MmdListResult => ({ rows, total: rows.length, page: 1, pageSize: 100 });

test("batch lookup deduplicates keys, chunks requests and caches unavailable records", async () => {
  const calls: MmdListInput[] = [];
  const data = createReferenceData({ resources, batchSize: 2, client: { list: async (input) => {
    calls.push(input);
    const ids = Array.isArray(input.where?.code) ? input.where.code : [];
    return result(ids.filter((id) => id !== "missing").map((code) => ({ code, name: `Name ${code}` })));
  } } });
  const first = data.resolve({ model: "people", id: "1" });
  expect(data.resolve({ model: "people", id: "1" })).toBe(first);
  expect(await Promise.all([first, ...["2", "3", "missing"].map((id) => data.resolve({ model: "people", id }))]))
    .toEqual(["Name 1", "Name 2", "Name 3", null]);
  expect(calls).toHaveLength(2);
  expect(calls[0]?.fields).toEqual(["code", "name"]);
  expect(await data.resolve({ model: "people", id: "missing" })).toBeNull();
  expect(calls).toHaveLength(2);
});

test("invalidation isolates pending batches and late search results from the current cache", async () => {
  const releases: Array<(result: MmdListResult) => void> = [];
  const data = createReferenceData({ resources, client: { list: () => new Promise((resolve) => releases.push(resolve)) } });
  const oldSearch = data.search({ model: "people", term: "old", page: 1 });
  const old = data.resolve({ model: "people", id: "1" });
  data.invalidate();
  const fresh = data.resolve({ model: "people", id: "1" });
  expect(fresh).not.toBe(old);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(releases).toHaveLength(3);
  releases[2]?.(result([{ code: "1", name: "fresh" }]));
  expect(await fresh).toBe("fresh");
  releases[1]?.(result([{ code: "1", name: "old" }]));
  releases[0]?.(result([{ code: "1", name: "old search" }]));
  await Promise.all([old, oldSearch]);
  expect(await data.resolve({ model: "people", id: "1" })).toBe("fresh");
});

test("failed lookup retries and default search supports non-UUID primary keys and pagination", async () => {
  let fail = true;
  const calls: MmdListInput[] = [];
  const data = createReferenceData({ resources: [{ name: "codes", primaryKey: "code" }], pageSize: 7,
    client: { list: async (input) => {
      calls.push(input);
      if (fail) { fail = false; throw new Error("offline"); }
      return result([{ code: "ABC" }]);
    } } });
  await expect(data.resolve({ model: "codes", id: "ABC" })).rejects.toThrow("offline");
  await expect(data.resolve({ model: "codes", id: "ABC" })).resolves.toBe("codes · ABC");
  await data.search({ model: "codes", term: " ABC ", page: 3 });
  expect(calls[2]).toMatchObject({ where: { code: "ABC" }, page: 3, pageSize: 7 });
});

test("conditional references preserve typed selectors, prefer specific matches and reject ambiguous targets", () => {
  const field: RendererField = { name: "owner", references: [
    { target: "fallback" }, { target: "people", when: { field: "kind", value: 0 } },
    { target: "teams", when: { field: "kind", value: "0" } },
  ] };
  const record = { kind: [0] };
  expect(referenceContext({ field, record }).model).toBe("people");
  expect(record).toEqual({ kind: [0] });
  expect(referenceContext({ field, record: { kind: ["0"] } }).model).toBe("teams");
  expect(referenceContext({ field: { ...field, references: field.references?.slice(1) }, record: { kind: [0, "0"] } }).canSelect).toBe(false);
  expect(referenceContext({ field: { name: "owner", references: [{ target: "a" }, { target: "b" }] } }).canSelect).toBe(false);
});
