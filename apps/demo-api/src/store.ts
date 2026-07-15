import type {
  ActionResponse,
  CreateProductInput,
  ListQuery,
  ListResponse,
  Product,
  ProductStatus,
  UpdateProductInput
} from "mmd-contracts";

const seededProducts: Product[] = [
  {
    id: "product-1001",
    name: "Aurora Desk Lamp",
    sku: "LAMP-001",
    cover:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=128&h=128&q=80",
    price: 129.99,
    tags: ["lighting", "workspace"],
    status: "draft",
    inventory: 24,
    createdAt: "2026-07-12T08:00:00.000Z",
    updatedAt: "2026-07-12T08:00:00.000Z"
  },
  {
    id: "product-1002",
    name: "Orbit Mechanical Keyboard",
    sku: "KEY-002",
    cover:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=128&h=128&q=80",
    price: 189,
    tags: ["keyboard", "workspace"],
    status: "published",
    inventory: 12,
    createdAt: "2026-07-11T08:00:00.000Z",
    updatedAt: "2026-07-13T08:00:00.000Z"
  },
  {
    id: "product-1003",
    name: "Slate Grid Notebook",
    sku: "NOTE-003",
    cover:
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=128&h=128&q=80",
    price: 18.5,
    tags: ["stationery"],
    status: "archived",
    inventory: 0,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-14T08:00:00.000Z"
  }
];

function cloneProduct(product: Product): Product {
  return { ...product, tags: [...product.tags] };
}

export class InMemoryProductStore {
  private products = seededProducts.map(cloneProduct);

  hasSku(sku: string, excludedId?: string): boolean {
    return this.products.some(
      (product) => product.sku === sku && product.id !== excludedId
    );
  }

  create(input: CreateProductInput): Product | undefined {
    if (this.hasSku(input.sku)) return undefined;

    const timestamp = new Date().toISOString();
    const product: Product = {
      id: `product-${crypto.randomUUID()}`,
      ...input,
      cover: input.cover ?? "",
      tags: input.tags ?? [],
      status: input.status ?? "draft",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.products.unshift(product);
    return cloneProduct(product);
  }

  get(id: string): Product | undefined {
    const product = this.products.find((candidate) => candidate.id === id);
    return product ? cloneProduct(product) : undefined;
  }

  update(id: string, input: UpdateProductInput): Product | undefined {
    const index = this.products.findIndex((product) => product.id === id);
    if (index === -1) return undefined;

    const product: Product = {
      ...this.products[index],
      ...input,
      cover: input.cover ?? this.products[index].cover,
      tags: input.tags ?? this.products[index].tags,
      updatedAt: new Date().toISOString()
    };
    this.products[index] = product;
    return cloneProduct(product);
  }

  delete(id: string): boolean {
    const index = this.products.findIndex((product) => product.id === id);
    if (index === -1) return false;

    this.products.splice(index, 1);
    return true;
  }

  setStatus(
    action: "publish" | "archive",
    ids: string[],
    status: ProductStatus
  ): ActionResponse<Product> | undefined {
    if (ids.some((id) => !this.products.some((product) => product.id === id))) {
      return undefined;
    }

    const timestamp = new Date().toISOString();
    const selected = new Set(ids);
    this.products = this.products.map((product) =>
      selected.has(product.id)
        ? { ...product, status, updatedAt: timestamp }
        : product
    );

    return {
      action,
      affected: ids.length,
      data: ids.map((id) =>
        cloneProduct(this.products.find((product) => product.id === id)!)
      )
    };
  }

  duplicate(ids: string[]): ActionResponse<Product> | undefined {
    const sources = ids.map((id) =>
      this.products.find((product) => product.id === id)
    );
    if (sources.some((product) => !product)) return undefined;

    const timestamp = new Date().toISOString();
    const data = sources.map((source) => {
      const product = source!;
      const baseSku = `${product.sku}-COPY`;
      let sku = baseSku;
      let suffix = 2;
      while (this.products.some((candidate) => candidate.sku === sku)) {
        sku = `${baseSku}-${suffix++}`;
      }

      const duplicate: Product = {
        ...product,
        id: `product-${crypto.randomUUID()}`,
        name: `${product.name} (Copy)`,
        sku,
        status: "draft",
        tags: [...product.tags],
        createdAt: timestamp,
        updatedAt: timestamp
      };
      this.products.unshift(duplicate);
      return cloneProduct(duplicate);
    });

    return { action: "duplicate", affected: data.length, data };
  }

  list(query: ListQuery = {}): ListResponse<Product> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const search = query.search?.toLowerCase();
    const filtered = this.products.filter((product) => {
      const matchesStatus = !query.status || product.status === query.status;
      const matchesSearch =
        !search ||
        [product.name, product.sku, ...product.tags].some((value) =>
          value.toLowerCase().includes(search)
        );

      return matchesStatus && matchesSearch;
    });
    const data = filtered.slice(start, start + pageSize).map(cloneProduct);

    return {
      data,
      total: filtered.length,
      page,
      pageSize
    };
  }
}
