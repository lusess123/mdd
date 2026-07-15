import { beforeEach, describe, expect, it, spyOn } from "bun:test";

import { createApp, edgeSessionId } from "./app";
import { MemoryProductAdapter } from "./memory-adapter";
import { createProductEngine } from "./product-engine";
import type { ProductRuntime } from "./runtime";
import { MetaResponseSchema } from "./schemas";

class RecordLimitAdapter extends MemoryProductAdapter {
  async create(
    _input: Parameters<MemoryProductAdapter["create"]>[0]
  ): Promise<Record<string, unknown>> {
    throw new Error("database rejected insert: MMD_SESSION_RECORD_LIMIT");
  }
}

class FailingListAdapter extends MemoryProductAdapter {
  async findMany(
    _input: Parameters<MemoryProductAdapter["findMany"]>[0]
  ): Promise<Record<string, unknown>[]> {
    throw new Error("database unavailable");
  }
}

function createFailingApp() {
  return createApp({
    runtime: {
      engine: createProductEngine(new FailingListAdapter()),
      dispose: async () => undefined
    }
  });
}

function createMemoryRuntime(): ProductRuntime {
  return {
    engine: createProductEngine(new MemoryProductAdapter()),
    dispose: async () => undefined
  };
}

async function createAppAtRecordLimit() {
  const runtime = createMemoryRuntime();
  for (let index = 0; index < 47; index += 1) {
    await runtime.engine.save({
      model: "Product",
      data: {
        name: `Limit product ${index}`,
        sku: `LIMIT-${index}`,
        price: 1,
        inventory: 1
      }
    });
  }
  return createApp({ runtime });
}

describe("MMD demo API", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ runtime: createMemoryRuntime() });
  });

  it("reports that the service is healthy", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("returns a validated request id on successful responses", async () => {
    const response = await app.request("/health", {
      headers: { "X-Request-Id": "request_test-123" }
    });

    expect(response.headers.get("X-Request-Id")).toBe("request_test-123");
  });

  it("requires a database when no test runtime is provided", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(
      () => undefined
    );

    try {
      const response = await createApp().request(
        "/api/mmd/query-list",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "request_database-123"
          },
          body: JSON.stringify({ model: "Product" })
        },
        { DATABASE_URL: "postgres://legacy-production-url" } as never
      );

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          details: { requestId: "request_database-123" }
        }
      });
      expect(consoleError).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "mmd_api_unhandled_error",
          error: expect.objectContaining({
            message: "Database connection is required"
          })
        })
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("uses the Hyperdrive connection for Worker requests", async () => {
    const calls: Array<{ connectionString: string; sessionId: string }> = [];
    let disconnects = 0;
    const hyperdriveApp = createApp({
      createRuntime: async (connectionString, sessionId) => {
        calls.push({ connectionString, sessionId });
        const runtime = createMemoryRuntime();
        return {
          ...runtime,
          dispose: async () => {
            disconnects += 1;
          }
        };
      }
    });

    const response = await hyperdriveApp.request(
      "/api/products",
      { headers: { "X-MMD-Session": "session_hyperdrive" } },
      {
        HYPERDRIVE: {
          connectionString: "postgres://hyperdrive"
        }
      }
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([
      {
        connectionString: "postgres://hyperdrive",
        sessionId: "session_hyperdrive"
      }
    ]);
    expect(disconnects).toBe(1);
  });

  it("uses an explicitly configured database URL for local Bun requests", async () => {
    const connectionStrings: string[] = [];
    const localApp = createApp({
      databaseUrl: "postgres://local",
      createRuntime: async (connectionString) => {
        connectionStrings.push(connectionString);
        return createMemoryRuntime();
      }
    });

    const response = await localApp.request("/api/products", {
      headers: { "X-MMD-Session": "session_local" }
    });

    expect(response.status).toBe(200);
    expect(connectionStrings).toEqual(["postgres://local"]);
  });

  it("returns a request id and logs a safe stack for unexpected errors", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(
      () => undefined
    );

    try {
      const response = await createFailingApp().request(
        "/api/mmd/query-list?debug=QUERY_SECRET",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer AUTH_SECRET",
            Cookie: "mmd_session=COOKIE_SECRET",
            "Content-Type": "application/json",
            "cf-ray": "ray_test_123",
            "X-MMD-Session": "SESSION_SECRET",
            "X-Request-Id": "request_error-123"
          },
          body: JSON.stringify({
            model: "Product",
            search: { name: "BODY_SECRET" }
          })
        }
      );
      const body = (await response.json()) as {
        error: {
          code: string;
          message: string;
          details: { requestId: string; stack?: string };
        };
      };

      expect(response.status).toBe(500);
      expect(response.headers.get("X-Request-Id")).toBe("request_error-123");
      expect(body).toEqual({
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          details: { requestId: "request_error-123" }
        }
      });
      expect(consoleError).toHaveBeenCalledTimes(1);

      const [log] = consoleError.mock.calls[0] ?? [];
      expect(log).toMatchObject({
        event: "mmd_api_unhandled_error",
        requestId: "request_error-123",
        cfRay: "ray_test_123",
        method: "POST",
        path: "/api/mmd/query-list",
        error: {
          name: "Error",
          message: "database unavailable",
          stack: expect.stringContaining("database unavailable")
        }
      });

      const serializedLog = JSON.stringify(log);
      for (const secret of [
        "AUTH_SECRET",
        "COOKIE_SECRET",
        "SESSION_SECRET",
        "BODY_SECRET",
        "QUERY_SECRET"
      ]) {
        expect(serializedLog).not.toContain(secret);
      }
    } finally {
      consoleError.mockRestore();
    }
  });

  it("exposes unexpected error stacks only when explicitly enabled", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(
      () => undefined
    );

    try {
      const response = await createFailingApp().request(
        "/api/mmd/query-list",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "request_stack-123"
          },
          body: JSON.stringify({ model: "Product" })
        },
        { EXPOSE_ERROR_STACKS: "true" }
      );
      const body = (await response.json()) as {
        error: { details: { requestId: string; stack?: string } };
      };

      expect(response.status).toBe(500);
      expect(body.error.details.requestId).toBe("request_stack-123");
      expect(body.error.details.stack).toContain("database unavailable");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("describes the Product model and its actions", async () => {
    const response = await app.request("/api/meta");
    const body = (await response.json()) as {
      models: Array<{ name: string }>;
      actions: Array<{ name: string }>;
    };

    expect(response.status).toBe(200);
    expect(MetaResponseSchema.safeParse(body).success).toBe(true);
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
    const corsApp = createApp({
      corsOrigin: "https://demo.example",
      runtime: createMemoryRuntime()
    });
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

  it("rate limits all API paths through one Cloudflare IP bucket", async () => {
    const keys: string[] = [];
    const env = {
      API_RATE_LIMITER: {
        limit: async ({ key }: { key: string }) => {
          keys.push(key);
          return { success: keys.length < 3 };
        }
      }
    };
    await app.request(
      "/api/products/dynamic-a",
      { headers: { "cf-connecting-ip": "203.0.113.10" } },
      env
    );
    await app.request(
      "/api/products/dynamic-b",
      { headers: { "cf-connecting-ip": "203.0.113.10" } },
      env
    );
    const response = await app.request(
      "/api/products?page=1",
      { headers: { "cf-connecting-ip": "203.0.113.10" } },
      env
    );

    expect(keys).toEqual([
      "mmd-demo:203.0.113.10",
      "mmd-demo:203.0.113.10",
      "mmd-demo:203.0.113.10"
    ]);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: { code: "RATE_LIMITED", message: "Too many requests" }
    });
  });

  it("binds production demo sessions to a hash of the Cloudflare IP", async () => {
    const first = await edgeSessionId("203.0.113.10");
    const same = await edgeSessionId("203.0.113.10");
    const other = await edgeSessionId("203.0.113.11");

    expect(first).toBe(same);
    expect(first).not.toBe(other);
    expect(first).toMatch(/^edge_[a-f0-9]{40}$/);
    expect(first).not.toContain("203.0.113.10");
  });

  it("does not rate limit health, docs, OpenAPI, or preflight requests", async () => {
    let calls = 0;
    const env = {
      API_RATE_LIMITER: {
        limit: async () => {
          calls += 1;
          return { success: false };
        }
      }
    };

    for (const path of ["/health", "/docs", "/openapi.json"]) {
      const response = await app.request(path, undefined, env);
      expect(response.status).not.toBe(429);
    }
    const preflight = await app.request(
      "/api/products",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://demo.example",
          "Access-Control-Request-Method": "POST"
        }
      },
      env
    );

    expect(preflight.status).not.toBe(429);
    expect(calls).toBe(0);
  });

  it("caps generic and REST creates at 50 records per session", async () => {
    const limitApp = await createAppAtRecordLimit();
    const requests = [
      {
        path: "/api/mmd/save",
        body: {
          model: "Product",
          data: {
            name: "Generic overflow",
            sku: "OVERFLOW-GENERIC",
            price: 1,
            inventory: 1
          }
        }
      },
      {
        path: "/api/products",
        body: {
          name: "REST overflow",
          sku: "OVERFLOW-REST",
          price: 1,
          inventory: 1
        }
      }
    ];

    for (const request of requests) {
      const response = await limitApp.request(request.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body)
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: {
          code: "SESSION_RECORD_LIMIT",
          message: "Demo sessions are limited to 50 records"
        }
      });
    }
  });

  it("caps generic and REST duplicate actions at 50 records per session", async () => {
    const limitApp = await createAppAtRecordLimit();
    const requests = [
      {
        path: "/api/mmd/actions/duplicate",
        body: { model: "Product", ids: ["product-1001"] }
      },
      {
        path: "/api/actions/duplicate",
        body: { ids: ["product-1001"] }
      }
    ];

    for (const request of requests) {
      const response = await limitApp.request(request.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body)
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: {
          code: "SESSION_RECORD_LIMIT",
          message: "Demo sessions are limited to 50 records"
        }
      });
    }
  });

  it("maps the atomic database quota error to the public session limit error", async () => {
    const constrainedApp = createApp({
      runtime: {
        engine: createProductEngine(new RecordLimitAdapter()),
        dispose: async () => undefined
      }
    });
    const response = await constrainedApp.request("/api/mmd/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Product",
        data: {
          name: "Concurrent overflow",
          sku: "CONCURRENT-OVERFLOW",
          price: 1,
          inventory: 1
        }
      })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "SESSION_RECORD_LIMIT",
        message: "Demo sessions are limited to 50 records"
      }
    });
  });

  it("publishes an OpenAPI document for every public endpoint", async () => {
    const response = await app.request("/openapi.json");
    const document = (await response.json()) as {
      openapi: string;
      info: { title: string };
      paths: Record<string, Record<string, unknown>>;
      components?: { schemas?: Record<string, unknown> };
    };

    expect(response.status).toBe(200);
    expect(document.openapi).toBe("3.1.0");
    expect(document.info.title).toBe("MMD API Reference");
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
    for (const [path, pathItem] of Object.entries(document.paths)) {
      if (path === "/health") continue;
      for (const operation of Object.values(pathItem)) {
        const responses = (operation as { responses?: Record<string, unknown> })
          .responses;
        expect(responses, `${path} should document rate limiting`).toHaveProperty(
          "429"
        );
        expect(responses, `${path} should document internal errors`).toHaveProperty(
          "500"
        );
      }
    }
    expect(
      (
        document.paths["/api/mmd/actions/{action}"]?.post as {
          responses: Record<string, unknown>;
        }
      ).responses
    ).toHaveProperty("409");
    expect(
      (
        document.paths["/api/actions/{action}"]?.post as {
          responses: Record<string, unknown>;
        }
      ).responses
    ).toHaveProperty("409");
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
