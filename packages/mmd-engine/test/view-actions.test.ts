import { expect, test } from "bun:test";
import { modelToListView } from "../src/views";

test("explicit empty action arrays keep read-only resources read-only", () => {
  const view = modelToListView({
    name: "Audit",
    fields: [],
    defaultActions: false,
    actions: [],
    dataActions: [],
  });
  expect(
    "actions" in view.dataContainers[0]!
      ? view.dataContainers[0].actions
      : undefined,
  ).toEqual([]);
  expect(
    "dataActions" in view.dataContainers[0]!
      ? view.dataContainers[0].dataActions
      : undefined,
  ).toEqual([]);
});

test("explicit actions are not duplicated and omitted arrays retain defaults", () => {
  const action = { name: "detail", label: "详情", type: "detail" as const };
  const view = modelToListView({
    name: "Audit",
    fields: [],
    defaultActions: false,
    dataActions: [action],
  });
  expect(
    "dataActions" in view.dataContainers[0]!
      ? view.dataContainers[0].dataActions
      : undefined,
  ).toEqual([action]);
  expect(
    "actions" in view.dataContainers[0]!
      ? view.dataContainers[0].actions
      : undefined,
  ).toEqual([]);
});

test("omitted defaultActions preserves standard CRUD buttons", () => {
  const container = modelToListView({ name: "Product", fields: [] })
    .dataContainers[0]!;
  expect("actions" in container ? container.actions : []).toContainEqual(
    expect.objectContaining({ name: "new" }),
  );
  expect(
    "dataActions" in container ? container.dataActions : [],
  ).toContainEqual(expect.objectContaining({ name: "edit" }));
});
