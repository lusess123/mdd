import {
  productModel,
  type Product,
  type ProductStatus
} from "mmd-contracts";
import {
  MmdEngine,
  MmdError,
  MmdRegistry,
  type MmdActionHandler,
  type MmdDataAdapter
} from "mmd-engine";

const productFields = productModel.fields.map((field) => field.name);

function requireProduct(
  product: Record<string, unknown> | null,
  id: string
): Product {
  if (!product) {
    throw new MmdError("RECORD_NOT_FOUND", `Product not found: ${id}`, { id });
  }
  return product as unknown as Product;
}

function changeStatus(status: ProductStatus): MmdActionHandler {
  return async ({ ids, engine }) => {
    const products = await Promise.all(
      ids.map((id) =>
        engine.queryOne({ model: productModel.name, id, fields: productFields })
      )
    );
    ids.forEach((id, index) => requireProduct(products[index] ?? null, id));

    const data = await Promise.all(
      ids.map((id) =>
        engine.save({ model: productModel.name, id, data: { status } })
      )
    );
    return { affected: data.length, data };
  };
}

const duplicateProduct: MmdActionHandler = async ({ ids, engine }) => {
  const products = await Promise.all(
    ids.map((id) =>
      engine.queryOne({ model: productModel.name, id, fields: productFields })
    )
  );
  const sources = ids.map((id, index) =>
    requireProduct(products[index] ?? null, id)
  );
  const data: Record<string, unknown>[] = [];

  for (const source of sources) {
    const baseSku = `${source.sku}-COPY`;
    let sku = baseSku;
    let suffix = 2;

    while (
      (
        await engine.queryList({
          model: productModel.name,
          filters: [{ field: "sku", operator: "eq", value: sku }],
          pageSize: 1
        })
      ).total > 0
    ) {
      sku = `${baseSku}-${suffix++}`;
    }

    data.push(
      await engine.save({
        model: productModel.name,
        data: {
          name: `${source.name} (Copy)`,
          sku,
          cover: source.cover,
          price: source.price,
          tags: source.tags,
          status: "draft",
          inventory: source.inventory
        }
      })
    );
  }

  return { affected: data.length, data };
};

export function createProductEngine(adapter: MmdDataAdapter): MmdEngine {
  const registry = new MmdRegistry().registerModel(productModel);
  return new MmdEngine({
    registry,
    adapter,
    actions: {
      publish: changeStatus("published"),
      archive: changeStatus("archived"),
      duplicate: duplicateProduct
    }
  });
}

export { productFields };
