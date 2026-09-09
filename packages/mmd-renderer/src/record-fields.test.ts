import { expect, test } from "bun:test";
import { createRecordFieldsSelector } from "./record-fields";

test("unrelated metadata, labels and dictionary options do not invalidate record queries", () => {
  const select = createRecordFieldsSelector();
  const initial = select([{ name: "id" }, { name: "status", options: [{ label: "Pending", value: "pending" }] }]);
  expect(select([{ name: "id", label: "编号" }, { name: "status", options: [{ label: "待处理", value: "pending" }] }])).toBe(initial);
  expect(select([{ name: "id" }, { name: "status" }])).toBe(initial);
});

test("adding, removing or reordering requested fields invalidates the query", () => {
  const select = createRecordFieldsSelector();
  const initial = select([{ name: "id" }]);
  const extended = select([{ name: "id" }, { name: "name" }]);
  expect(extended).not.toBe(initial);
  expect(extended).toEqual(["id", "name"]);
  const reordered = select([{ name: "name" }, { name: "id" }]);
  expect(reordered).not.toBe(extended);
  expect(select([{ name: "id" }])).not.toBe(reordered);
  expect(initial).toEqual(["id"]);
});


test("conditional relation discriminator is queried even when hidden from display", () => {
  const select = createRecordFieldsSelector();
  const fields = [{ name: "owner", references: [{ target: "users", when: { field: "kind", value: "user" } }] }];
  const first = select(fields);
  expect(first).toEqual(["owner", "kind"]);
  expect(select([{ ...fields[0]!, label: "Translated" }])).toBe(first);
  expect(select([{ name: "owner", references: [{ target: "teams", when: { field: "type", value: "team" } }] }])).toEqual(["owner", "type"]);
});
