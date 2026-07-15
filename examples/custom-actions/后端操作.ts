import { productModel, type Product, type ProductStatus } from "mmd-contracts";
import {
  MmdEngine,
  MmdError,
  MmdRegistry,
  type MmdActionHandler,
  type MmdDataAdapter,
} from "mmd-engine";

const fields = productModel.fields.map((field) => field.name);

function changeStatus(status: ProductStatus): MmdActionHandler {
  return async ({ ids, engine, model }) => {
    const data = await Promise.all(
      ids.map((id) => engine.save({ model: model.name, id, data: { status } })),
    );
    return { affected: data.length, data };
  };
}

const duplicate: MmdActionHandler = async ({ ids, engine, model }) => {
  const data: Record<string, unknown>[] = [];

  for (const id of ids) {
    const source = (await engine.queryOne({
      model: model.name,
      id,
      fields,
    })) as unknown as Product | null;
    if (!source) throw new MmdError("RECORD_NOT_FOUND", `Product not found: ${id}`);

    let sku = `${source.sku}-COPY`;
    let suffix = 2;
    while (
      (await engine.queryList({
        model: model.name,
        filters: [{ field: "sku", operator: "eq", value: sku }],
        pageSize: 1,
      })).total > 0
    ) {
      sku = `${source.sku}-COPY-${suffix++}`;
    }

    data.push(
      await engine.save({
        model: model.name,
        data: {
          name: `${source.name} (Copy)`,
          sku,
          cover: source.cover,
          price: source.price,
          tags: source.tags,
          status: "draft",
          inventory: source.inventory,
        },
      }),
    );
  }

  return { affected: data.length, data };
};

export function createEngine(adapter: MmdDataAdapter) {
  return new MmdEngine({
    registry: new MmdRegistry().registerModel(productModel),
    adapter,
    actions: {
      publish: changeStatus("published"),
      archive: changeStatus("archived"),
      duplicate,
    },
  });
}
