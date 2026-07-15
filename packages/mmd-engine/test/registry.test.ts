import { describe, expect, test } from "bun:test";
import {
  ModelFieldType,
  PageStyle,
  type ModelDefinition
} from "mmd-contracts";
import { MmdRegistry } from "../src/index";

const productModel: ModelDefinition = {
  name: "Product",
  label: "商品",
  displayField: "name",
  fields: [
    { name: "id", fieldType: ModelFieldType.Key },
    { name: "name", label: "名称", fieldType: ModelFieldType.Text },
    {
      name: "secret",
      fieldType: ModelFieldType.Text,
      pageStyle: [PageStyle.Edit]
    },
    {
      name: "category",
      fieldType: ModelFieldType.ToOne,
      relationModel: "Category"
    },
    {
      name: "status",
      fieldType: ModelFieldType.Single,
      dictName: "ProductStatus"
    }
  ],
  actions: [
    { name: "export", label: "导出", placement: "page" },
    { name: "publish", label: "发布", placement: "row" }
  ]
};

describe("MmdRegistry", () => {
  test("注册模型后自动生成列表视图，并递归汇总关联元数据", () => {
    const registry = new MmdRegistry();
    registry.registerModel(productModel);
    registry.registerModel({
      name: "Category",
      fields: [
        { name: "id", fieldType: ModelFieldType.Key },
        { name: "name", fieldType: ModelFieldType.Text }
      ]
    });
    registry.registerDict("ProductStatus", {
      draft: { label: "草稿", value: "draft" }
    });

    const view = registry.getView("Product.listview");
    const meta = registry.getMeta({ models: ["Product"] });

    expect(view?.type).toBe("list");
    expect(view?.dataContainers[0]?.fields.map((field) => field.name)).toEqual([
      "name",
      "category",
      "status"
    ]);
    expect(meta.models).toHaveProperty("Category");
    expect(meta.dicts.ProductStatus?.draft.index).toBe(0);
    const container = view?.dataContainers[0];
    expect(container && "actions" in container ? container.actions : []).toContainEqual(
      expect.objectContaining({ name: "export" })
    );
    expect(
      container && "dataActions" in container ? container.dataActions : []
    ).toContainEqual(expect.objectContaining({ name: "publish" }));
  });

  test("不同注册表和读取结果之间不共享可变元数据", () => {
    const registry = new MmdRegistry().registerModel(productModel);
    const other = new MmdRegistry();
    const firstRead = registry.getModel("Product");

    firstRead!.label = "已篡改";
    firstRead!.fields.push({ name: "injected", fieldType: ModelFieldType.Text });

    expect(registry.getModel("Product")?.label).toBe("商品");
    expect(registry.getModel("Product")?.fields).toHaveLength(5);
    expect(other.getModel("Product")).toBeUndefined();
  });
});
