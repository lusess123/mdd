import { beforeEach, describe, expect, it } from "bun:test";

import { createApp } from "./app";

describe("MMD demo API", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("reports that the service is healthy", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("describes the Product model and its actions", async () => {
    const response = await app.request("/api/meta");
    const body = (await response.json()) as {
      models: Array<{ name: string }>;
      actions: Array<{ name: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.models.map((model) => model.name)).toEqual(["Product"]);
    expect([...new Set(body.actions.map((action) => action.name))]).toEqual([
      "publish",
      "archive",
      "duplicate"
    ]);
  });

  it("lists the seeded products", async () => {
    const response = await app.request("/api/products");
    const body = (await response.json()) as {
      data: Array<{ id: string }>;
      total: number;
      page: number;
      pageSize: number;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ total: 3, page: 1, pageSize: 20 });
    expect(body.data.map((product) => product.id)).toEqual([
      "product-1003",
      "product-1002",
      "product-1001"
    ]);
  });

  it("serves model and generated view metadata through the generic MMD API", async () => {
    const response = await app.request("/api/mmd/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        models: ["Product"],
        views: ["Product.listview", "Product.editview"]
      })
    });
    const body = (await response.json()) as {
      models: Record<string, { name: string }>;
      views: Record<string, { type: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.models.Product?.name).toBe("Product");
    expect(body.views["Product.listview"]?.type).toBe("list");
    expect(body.views["Product.editview"]?.type).toBe("edit");
  });

  it("runs safe list queries through the generic MMD API", async () => {
    const response = await app.request("/api/mmd/query-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Product",
        search: { status: "draft" },
        sort: [{ field: "name", direction: "asc" }]
      })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      total: 1,
      data: [{ id: "product-1001", status: "draft" }]
    });
  });

  it("rejects unknown generic query fields before they reach the adapter", async () => {
    const response = await app.request("/api/mmd/query-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "Product", search: { password: "secret" } })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "FIELD_NOT_FOUND" }
    });
  });

  it("saves and executes declared actions through the generic MMD API", async () => {
    const saveResponse = await app.request("/api/mmd/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Product",
        data: {
          name: "Comic Pen",
          sku: "PEN-009",
          cover: "https://example.com/pen.jpg",
          price: 12,
          tags: ["drawing"],
          inventory: 20
        }
      })
    });
    const saved = (await saveResponse.json()) as { data: { id: string } };
    expect(saveResponse.status).toBe(201);

    const actionResponse = await app.request("/api/mmd/actions/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "Product", ids: [saved.data.id] })
    });
    expect(actionResponse.status).toBe(200);
    expect(await actionResponse.json()).toMatchObject({
      action: "publish",
      affected: 1,
      data: [{ id: saved.data.id, status: "published" }]
    });
  });

  it("creates a product with only its required fields through the generic MMD API", async () => {
    const response = await app.request("/api/mmd/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Product",
        data: {
          name: "Coverless Pencil",
          sku: "PENCIL-010",
          price: 3,
          inventory: 10
        }
      })
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      data: {
        name: "Coverless Pencil",
        cover: "",
        tags: [],
        status: "draft"
      }
    });
  });

  it("validates Product values submitted through the generic MMD API", async () => {
    const response = await app.request("/api/mmd/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Product",
        data: {
          name: "Invalid Pencil",
          sku: "PENCIL-011",
          price: -1,
          tags: [],
          inventory: 10
        }
      })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" }
    });
  });

  it("rejects duplicate Product SKUs through the generic MMD API", async () => {
    const response = await app.request("/api/mmd/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Product",
        data: {
          name: "Duplicate Lamp",
          sku: "LAMP-001",
          price: 10,
          tags: [],
          inventory: 1
        }
      })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "SKU_CONFLICT", message: "SKU already exists" }
    });
  });

  it("returns a stable error when a generic Product update target is missing", async () => {
    const response = await app.request("/api/mmd/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Product",
        id: "missing-product",
        data: { name: "Missing" }
      })
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "RECORD_NOT_FOUND", message: "Record not found" }
    });
  });

  it("does not partially mutate products when a bulk action includes a missing id", async () => {
    const actionResponse = await app.request("/api/mmd/actions/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Product",
        ids: ["product-1001", "missing-product"]
      })
    });

    expect(actionResponse.status).toBe(404);

    const productResponse = await app.request("/api/products/product-1001");
    expect(await productResponse.json()).toMatchObject({
      data: { status: "draft" }
    });
  });

  it("filters and paginates the product list", async () => {
    const response = await app.request(
      "/api/products?search=lamp&status=draft&page=1&pageSize=1"
    );
    const body = (await response.json()) as {
      data: Array<{ id: string }>;
      total: number;
      pageSize: number;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ total: 1, pageSize: 1 });
    expect(body.data.map((product) => product.id)).toEqual(["product-1001"]);
  });

  it("gets one product by id", async () => {
    const response = await app.request("/api/products/product-1002");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        id: "product-1002",
        name: "Orbit Mechanical Keyboard",
        sku: "KEY-002"
      }
    });
  });

  it("returns a stable error when a product does not exist", async () => {
    const response = await app.request("/api/products/missing");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found"
      }
    });
  });

  it("creates a product that can be retrieved", async () => {
    const response = await app.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Lift Laptop Stand",
        sku: "STAND-004",
        cover: "https://example.com/laptop-stand.jpg",
        price: 79,
        tags: ["workspace"],
        inventory: 8
      })
    });
    const body = (await response.json()) as {
      data: { id: string; status: string };
    };

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ status: "draft" });

    const getResponse = await app.request(`/api/products/${body.data.id}`);
    expect(await getResponse.json()).toMatchObject({
      data: { name: "Lift Laptop Stand", sku: "STAND-004" }
    });
  });

  it("rejects an invalid product with a translatable error code", async () => {
    const response = await app.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Incomplete product", price: -1 })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request"
      }
    });
  });

  it("updates an existing product", async () => {
    const response = await app.request("/api/products/product-1001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Aurora Lamp Pro", inventory: 30 })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        id: "product-1001",
        name: "Aurora Lamp Pro",
        inventory: 30,
        sku: "LAMP-001",
        cover:
          "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=128&h=128&q=80"
      }
    });
  });

  it("deletes a product", async () => {
    const response = await app.request("/api/products/product-1003", {
      method: "DELETE"
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });

    const getResponse = await app.request("/api/products/product-1003");
    expect(getResponse.status).toBe(404);
  });

  it("publishes selected products", async () => {
    const response = await app.request("/api/actions/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["product-1001"] })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      action: "publish",
      affected: 1,
      data: [{ id: "product-1001", status: "published" }]
    });
  });

  it("archives selected products", async () => {
    const response = await app.request("/api/actions/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["product-1001", "product-1002"] })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      action: "archive",
      affected: 2,
      data: [
        { id: "product-1001", status: "archived" },
        { id: "product-1002", status: "archived" }
      ]
    });
  });

  it("duplicates selected products with new identities", async () => {
    const response = await app.request("/api/actions/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["product-1001"] })
    });
    const body = (await response.json()) as {
      action: string;
      affected: number;
      data: Array<{ id: string; name: string; sku: string; status: string }>;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      action: "duplicate",
      affected: 1,
      data: [
        {
          name: "Aurora Desk Lamp (Copy)",
          sku: "LAMP-001-COPY",
          status: "draft"
        }
      ]
    });
    expect(body.data[0]?.id).not.toBe("product-1001");
  });

  it("rejects a duplicate SKU with a stable conflict code", async () => {
    const response = await app.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate SKU",
        sku: "LAMP-001",
        cover: "https://example.com/duplicate.jpg",
        price: 50,
        tags: [],
        inventory: 1
      })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "SKU_CONFLICT", message: "SKU already exists" }
    });
  });

  it("rejects invalid list query values", async () => {
    const response = await app.request("/api/products?page=0&pageSize=101");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" }
    });
  });

  it("uses the configured CORS origin", async () => {
    const corsApp = createApp({ corsOrigin: "https://demo.example" });
    const response = await corsApp.request("/api/products", {
      headers: { Origin: "https://demo.example" }
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://demo.example"
    );
  });

  it("reads the CORS origin from a Cloudflare binding", async () => {
    const response = await app.request(
      "/api/products",
      { headers: { Origin: "https://docs.example" } },
      { CORS_ORIGIN: "https://docs.example" }
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://docs.example"
    );
  });

  it("publishes an OpenAPI document for every public endpoint", async () => {
    const response = await app.request("/openapi.json");
    const document = (await response.json()) as {
      openapi: string;
      paths: Record<string, Record<string, unknown>>;
      components?: { schemas?: Record<string, unknown> };
    };

    expect(response.status).toBe(200);
    expect(document.openapi).toBe("3.1.0");
    expect(Object.keys(document.paths).sort()).toEqual(
      [
        "/api/actions/{action}",
        "/api/meta",
        "/api/mmd/actions/{action}",
        "/api/mmd/meta",
        "/api/mmd/query-list",
        "/api/mmd/query-one",
        "/api/mmd/remove",
        "/api/mmd/save",
        "/api/products",
        "/api/products/{id}",
        "/health"
      ].sort()
    );
    expect(document.components?.schemas).toHaveProperty("Product");
  });

  it("returns a stable error for an unknown route", async () => {
    const response = await app.request("/missing-route");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found" }
    });
  });

  it("rejects changing a product to an existing SKU", async () => {
    const response = await app.request("/api/products/product-1001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: "KEY-002" })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "SKU_CONFLICT", message: "SKU already exists" }
    });
  });

  it("returns a stable error for an unsupported action", async () => {
    const response = await app.request("/api/actions/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["product-1001"] })
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "ACTION_NOT_FOUND", message: "Action not found" }
    });
  });
});
