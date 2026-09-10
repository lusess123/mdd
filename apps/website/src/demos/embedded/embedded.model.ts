import { ModelFieldType as Field, type ModelDefinition } from "mmd-contracts";
import type { MmdLocale, ResourceDescriptor } from "mmd-renderer";

export function demoDefinitions(locale: MmdLocale) {
  const text = (zh: string, en: string) => (locale === "zh-CN" ? zh : en);
  const models: ModelDefinition[] = [
    {
      name: "Category",
      label: text("分类", "Categories"),
      primaryKey: "id",
      displayField: "name",
      fields: [
        {
          name: "id",
          fieldType: Field.Key,
          list: true,
          readOnly: true,
          filter: { kind: "id", primary: true },
        },
        {
          name: "name",
          label: text("名称", "Name"),
          fieldType: Field.Text,
          required: true,
          filter: { kind: "text", primary: true },
        },
      ],
    },
    {
      name: "Item",
      label: text("明细", "Items"),
      primaryKey: "id",
      displayField: "name",
      fields: [
        {
          name: "id",
          fieldType: Field.Key,
          list: true,
          readOnly: true,
          filter: { kind: "id", primary: true },
        },
        {
          name: "name",
          label: text("名称", "Name"),
          fieldType: Field.Text,
          required: true,
          filter: { kind: "text", primary: true },
        },
        {
          name: "categoryId",
          label: text("分类", "Category"),
          fieldType: Field.ToOne,
          references: [{ target: "Category" }],
          required: true,
          filter: { kind: "reference", primary: true },
        },
        {
          name: "status",
          label: text("状态", "Status"),
          fieldType: Field.Single,
          options: [
            { label: text("数字零", "Numeric zero"), value: 0 },
            { label: text("字符串零", "Text zero"), value: "0" },
            { label: text("布尔假", "Boolean false"), value: false },
          ],
          filter: { kind: "enum", primary: true },
        },
        {
          name: "active",
          label: text("启用", "Active"),
          fieldType: Field.Boolean,
          filter: { kind: "boolean", primary: false },
        },
        {
          name: "amount",
          label: text("金额", "Amount"),
          fieldType: Field.Number,
          decimal: true,
          filter: { kind: "number", decimal: true, primary: false },
        },
        {
          name: "notes",
          label: "JSON",
          fieldType: Field.Text,
          type: "json",
          list: false,
          filter: false,
        },
        {
          name: "createdAt",
          label: text("创建时间", "Created"),
          fieldType: Field.DateTime,
          readOnly: true,
          filter: { kind: "datetime", primary: false },
        },
      ],
    },
  ];
  const resources: ResourceDescriptor[] = models.map((model) => ({
    name: model.name,
    label: model.label,
    description: text(
      "使用真实 MMD 组件与 Engine，数据仅保存在当前页面。",
      "Real MMD components and Engine, with data kept only in this page.",
    ),
    capabilities: { create: true, update: true, remove: true },
    references:
      model.name === "Item"
        ? [
            {
              field: "categoryId",
              target: "Category",
              label: text("分类", "Category"),
            },
          ]
        : [],
    children:
      model.name === "Category"
        ? [{ model: "Item", field: "categoryId", label: text("明细", "Items") }]
        : [],
  }));
  return { models, resources };
}
