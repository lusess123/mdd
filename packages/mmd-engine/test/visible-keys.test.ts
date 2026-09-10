import { expect, test } from "bun:test";
import { ModelFieldType, PageStyle, type FieldDefinition } from "mmd-contracts";
import {
  modelToDetailView,
  modelToFormView,
  modelToListView,
} from "../src/views";

function views(id: Partial<FieldDefinition> = {}) {
  const model = {
    name: "Records",
    primaryKey: "id",
    fields: [
      { name: "id", fieldType: ModelFieldType.Key, ...id },
      { name: "name", fieldType: ModelFieldType.Text },
    ],
  };
  return {
    list: modelToListView(model).dataContainers[0].fields,
    detail: modelToDetailView(model).dataContainers[0].fields,
    edit: modelToFormView(model, "edit").dataContainers[0].fields,
    create: modelToFormView(model, "new").dataContainers[0].fields,
  };
}

test("Key remains hidden by default; list:true exposes a copyable key only in list/detail", () => {
  for (const list of [undefined, false]) {
    const hidden = views({ list });
    expect(hidden.list.map((field) => field.name)).toEqual(["name"]);
    expect(hidden.detail.map((field) => field.name)).toEqual(["name"]);
  }
  const visible = views({ list: true, readOnly: true });
  expect(visible.list.map((field) => field.name)).toEqual(["id", "name"]);
  expect(visible.detail.map((field) => field.name)).toEqual(["id", "name"]);
  expect(visible.list[0].renderer).toBe("key");
  expect(visible.detail[0].renderer).toBe("key");
  expect(visible.edit.map((field) => field.name)).toEqual(["name"]);
  expect(visible.create.map((field) => field.name)).toEqual(["name"]);
});

test("explicit Key visibility still respects pageStyle and custom renderers", () => {
  const listOnly = views({ list: true, pageStyle: [PageStyle.List] });
  expect(listOnly.list.map((field) => field.name)).toContain("id");
  expect(listOnly.detail.map((field) => field.name)).not.toContain("id");
  const detailOnly = views({ list: true, pageStyle: [PageStyle.Detail] });
  expect(detailOnly.list.map((field) => field.name)).not.toContain("id");
  expect(detailOnly.detail.map((field) => field.name)).toContain("id");
  const explicit = views({
    list: true,
    type: "custom-id",
    pageStyle: [PageStyle.ReadOnly],
  });
  expect(explicit.list[0].renderer).toBe("custom-id");
  expect(explicit.detail[0].renderer).toBe("custom-id");
  expect(explicit.edit.map((field) => field.name)).not.toContain("id");
});

test("显式筛选扩展到主键数值外键并尊重禁用与 Search 页面限制", () => {
  const model = { name: "Filters", fields: [
    { name: "id", fieldType: ModelFieldType.Key, filter: { kind: "id" as const } },
    { name: "price", fieldType: ModelFieldType.Number, filter: { kind: "number" as const, decimal: true } },
    { name: "owner", fieldType: ModelFieldType.ToOne, filter: { kind: "reference" as const } },
    { name: "hidden", fieldType: ModelFieldType.Text, filter: false as const },
    { name: "detail", fieldType: ModelFieldType.Text, filter: { kind: "text" as const }, pageStyle: [PageStyle.Detail] },
  ] };
  const container = modelToListView(model).dataContainers[0];
  if (!container || !("search" in container)) throw new Error("List search missing");
  const search = container.search as import("mmd-contracts").SearchConfig;
  expect(search.fields.map((field) => field.name)).toEqual(["id", "price", "owner"]);
  expect(search.fields[1]?.filter).toEqual({ kind: "number", decimal: true });
});
