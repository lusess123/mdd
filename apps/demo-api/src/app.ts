import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import {
  productModel,
  type MetaRequest,
  type Product
} from "mmd-contracts";
import {
  MmdError,
  type ExecuteActionRequest,
  type QueryListRequest,
  type QueryOneRequest,
  type RemoveRequest,
  type SaveRequest
} from "mmd-engine";

import { registerOpenApi } from "./openapi";
import { productFields } from "./product-engine";
import {
  createMemoryRuntime,
  createNeonRuntime,
  type ProductRuntime
} from "./runtime";
import {
  ActionRequestSchema,
  CreateProductSchema,
  ExecuteActionRequestSchema,
  ListQuerySchema,
  MetaRequestSchema,
  QueryListRequestSchema,
  QueryOneRequestSchema,
  RemoveRequestSchema,
  SaveRequestSchema,
  UpdateProductSchema
} from "./schemas";

type Bindings = {
  CORS_ORIGIN?: string;
  DATABASE_URL?: string;
};

type AppEnvironment = {
  Bindings: Bindings;
};

export interface CreateAppOptions {
  corsOrigin?: string | string[];
  databaseUrl?: string;
  runtime?: ProductRuntime;
}

type AppContext = Context<AppEnvironment>;
type ProductRow = Product & Record<string, unknown>;

function normalizeOrigins(value: string | string[]): string | string[] {
  if (Array.isArray(value) || !value.includes(",")) return value;
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function jsonError(
  context: AppContext,
  status: 400 | 404 | 409 | 500,
  code: string,
  message: string,
  details?: unknown
) {
  return context.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    status
  );
}

function sessionId(context: AppContext): string {
  const supplied = context.req.header("x-mmd-session");
  if (supplied && /^[a-zA-Z0-9_-]{8,64}$/.test(supplied)) return supplied;

  const existing = getCookie(context, "mmd_session");
  if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;

  const created = `demo_${crypto.randomUUID().replaceAll("-", "")}`;
  setCookie(context, "mmd_session", created, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "Lax",
    secure: new URL(context.req.url).protocol === "https:"
  });
  return created;
}

function defaultMetaRequest(): MetaRequest {
  return {
    models: [productModel.name],
    views: [
      `${productModel.name}.listview`,
      `${productModel.name}.detailview`,
      `${productModel.name}.newview`,
      `${productModel.name}.editview`
    ]
  };
}

function isUniqueConstraint(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
  );
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new OpenAPIHono<AppEnvironment>();
  const sharedRuntime = options.runtime ?? createMemoryRuntime();

  async function withRuntime<T>(
    context: AppContext,
    run: (runtime: ProductRuntime) => Promise<T>
  ): Promise<T> {
    const databaseUrl = options.databaseUrl ?? context.env?.DATABASE_URL;
    const runtime = databaseUrl
      ? await createNeonRuntime(databaseUrl, sessionId(context))
      : sharedRuntime;
    try {
      return await run(runtime);
    } finally {
      if (runtime !== sharedRuntime) await runtime.dispose();
    }
  }

  async function hasSku(
    runtime: ProductRuntime,
    sku: string,
    excludedId?: string
  ): Promise<boolean> {
    const result = await runtime.engine.queryList<ProductRow>({
      model: productModel.name,
      fields: ["id", "sku"],
      filters: [{ field: "sku", operator: "eq", value: sku }],
      pageSize: 2
    });
    return result.data.some((product) => product.id !== excludedId);
  }

  app.use("*", async (context, next) => {
    const origin = normalizeOrigins(
      options.corsOrigin ?? context.env?.CORS_ORIGIN ?? "*"
    );
    return cors({
      origin,
      allowHeaders: ["Content-Type", "Authorization", "X-MMD-Session"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["X-MMD-Session"],
      maxAge: 86400,
      credentials: origin !== "*"
    })(context, next);
  });

  app.get("/health", (context) => context.json({ status: "ok" }));
  app.get(
    "/docs",
    apiReference({
      pageTitle: "MMD Demo API",
      spec: { url: "/openapi.json" },
      theme: "kepler"
    })
  );

  // 通用 MMD 协议：渲染器默认使用这些端点。
  app.post("/api/mmd/meta", async (context) => {
    const json = await context.req.json().catch(() => ({}));
    const input = MetaRequestSchema.safeParse(json);
    if (!input.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request", input.error.issues);
    }
    return withRuntime(context, async ({ engine }) =>
      context.json(engine.getMeta(Object.keys(input.data).length ? input.data : defaultMetaRequest()))
    );
  });

  app.post("/api/mmd/query-list", async (context) => {
    const input = QueryListRequestSchema.safeParse(
      await context.req.json().catch(() => undefined)
    );
    if (!input.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request", input.error.issues);
    }
    return withRuntime(context, async ({ engine }) => {
      const { where, ...request } = input.data;
      return context.json(
        await engine.queryList({
          ...(request as QueryListRequest),
          filters: [
            ...(request.filters ?? []),
            ...Object.entries(where ?? {}).map(([field, value]) => ({
              field,
              operator: "eq" as const,
              value
            }))
          ]
        })
      );
    });
  });

  app.post("/api/mmd/query-one", async (context) => {
    const input = QueryOneRequestSchema.safeParse(
      await context.req.json().catch(() => undefined)
    );
    if (!input.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request", input.error.issues);
    }
    return withRuntime(context, async ({ engine }) => {
      const data = await engine.queryOne(input.data as QueryOneRequest);
      return data
        ? context.json({ data })
        : jsonError(context, 404, "RECORD_NOT_FOUND", "Record not found");
    });
  });

  app.post("/api/mmd/save", async (context) => {
    const input = SaveRequestSchema.safeParse(
      await context.req.json().catch(() => undefined)
    );
    if (!input.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request", input.error.issues);
    }
    let request = input.data;
    if (request.model === productModel.name) {
      const productInput = (
        request.id ? UpdateProductSchema : CreateProductSchema
      ).safeParse(request.data);
      if (!productInput.success) {
        return jsonError(
          context,
          400,
          "VALIDATION_ERROR",
          "Invalid request",
          productInput.error.issues
        );
      }
      request = { ...request, data: productInput.data };
    }
    try {
      return await withRuntime(context, async (runtime) => {
        if (
          request.id &&
          !(await runtime.engine.queryOne({
            model: request.model,
            id: request.id
          }))
        ) {
          return jsonError(
            context,
            404,
            "RECORD_NOT_FOUND",
            "Record not found"
          );
        }
        if (
          request.model === productModel.name &&
          typeof request.data.sku === "string" &&
          (await hasSku(runtime, request.data.sku, request.id))
        ) {
          return jsonError(context, 409, "SKU_CONFLICT", "SKU already exists");
        }
        return context.json(
          { data: await runtime.engine.save(request as SaveRequest) },
          request.id ? 200 : 201
        );
      });
    } catch (error) {
      if (isUniqueConstraint(error)) {
        return jsonError(context, 409, "SKU_CONFLICT", "SKU already exists");
      }
      throw error;
    }
  });

  app.post("/api/mmd/remove", async (context) => {
    const input = RemoveRequestSchema.safeParse(
      await context.req.json().catch(() => undefined)
    );
    if (!input.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request", input.error.issues);
    }
    return withRuntime(context, async ({ engine }) => {
      const ids = input.data.ids ?? [input.data.id!];
      const data = (
        await Promise.all(
          ids.map((id) =>
            engine.remove({ model: input.data.model, id } as RemoveRequest)
          )
        )
      ).filter((row): row is Record<string, unknown> => row !== null);
      return data.length > 0
        ? context.json({ success: true as const, affected: data.length, data })
        : jsonError(context, 404, "RECORD_NOT_FOUND", "Record not found");
    });
  });

  app.post("/api/mmd/actions/:action", async (context) => {
    const parsed = ExecuteActionRequestSchema.safeParse({
      ...(await context.req.json().catch(() => undefined)),
      action: context.req.param("action")
    });
    if (!parsed.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }
    return withRuntime(context, async ({ engine }) =>
      context.json(
        await engine.executeAction({
          ...(parsed.data as ExecuteActionRequest),
          payload: parsed.data.payload ?? parsed.data.row
        })
      )
    );
  });

  // Product REST 别名：便于 curl、OpenAPI 与非 MMD 客户端直接使用。
  app.get("/api/meta", (context) => {
    const actions = (productModel.actions ?? []).filter(
      (action, index, all) =>
        all.findIndex((candidate) => candidate.name === action.name) === index
    );
    return context.json({ models: [productModel], actions });
  });

  app.get("/api/products", (context) => {
    const input = ListQuerySchema.safeParse(context.req.query());
    if (!input.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request");
    }
    return withRuntime(context, async ({ engine }) =>
      context.json(
        await engine.queryList<ProductRow>({
          model: productModel.name,
          fields: productFields,
          page: input.data.page,
          pageSize: input.data.pageSize,
          search: {
            ...(input.data.search ? { name: input.data.search } : {}),
            ...(input.data.status ? { status: input.data.status } : {})
          }
        })
      )
    );
  });

  app.get("/api/products/:id", (context) =>
    withRuntime(context, async ({ engine }) => {
      const product = await engine.queryOne<ProductRow>({
        model: productModel.name,
        id: context.req.param("id"),
        fields: productFields
      });
      return product
        ? context.json({ data: product })
        : jsonError(context, 404, "PRODUCT_NOT_FOUND", "Product not found");
    })
  );

  app.post("/api/products", async (context) => {
    const input = CreateProductSchema.safeParse(
      await context.req.json().catch(() => undefined)
    );
    if (!input.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request", input.error.issues);
    }
    try {
      return await withRuntime(context, async (runtime) => {
        if (await hasSku(runtime, input.data.sku)) {
          return jsonError(context, 409, "SKU_CONFLICT", "SKU already exists");
        }
        const data = await runtime.engine.save<ProductRow>({
          model: productModel.name,
          data: input.data
        });
        return context.json({ data }, 201);
      });
    } catch (error) {
      if (isUniqueConstraint(error)) {
        return jsonError(context, 409, "SKU_CONFLICT", "SKU already exists");
      }
      throw error;
    }
  });

  app.patch("/api/products/:id", async (context) => {
    const input = UpdateProductSchema.safeParse(
      await context.req.json().catch(() => undefined)
    );
    if (!input.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request");
    }
    try {
      return await withRuntime(context, async (runtime) => {
        const id = context.req.param("id");
        const existing = await runtime.engine.queryOne({
          model: productModel.name,
          id,
          fields: ["id"]
        });
        if (!existing) {
          return jsonError(context, 404, "PRODUCT_NOT_FOUND", "Product not found");
        }
        if (input.data.sku && (await hasSku(runtime, input.data.sku, id))) {
          return jsonError(context, 409, "SKU_CONFLICT", "SKU already exists");
        }
        return context.json({
          data: await runtime.engine.save<ProductRow>({
            model: productModel.name,
            id,
            data: input.data
          })
        });
      });
    } catch (error) {
      if (isUniqueConstraint(error)) {
        return jsonError(context, 409, "SKU_CONFLICT", "SKU already exists");
      }
      throw error;
    }
  });

  app.delete("/api/products/:id", (context) =>
    withRuntime(context, async ({ engine }) => {
      const product = await engine.remove<ProductRow>({
        model: productModel.name,
        id: context.req.param("id")
      });
      return product
        ? context.json({ success: true as const })
        : jsonError(context, 404, "PRODUCT_NOT_FOUND", "Product not found");
    })
  );

  app.post("/api/actions/:action", async (context) => {
    const input = ActionRequestSchema.safeParse(
      await context.req.json().catch(() => undefined)
    );
    if (!input.success) {
      return jsonError(context, 400, "VALIDATION_ERROR", "Invalid request");
    }
    try {
      return await withRuntime(context, async ({ engine }) =>
        context.json(
          await engine.executeAction<ProductRow>({
            model: productModel.name,
            action: context.req.param("action"),
            ids: input.data.ids,
            payload: input.data.payload
          })
        )
      );
    } catch (error) {
      if (error instanceof MmdError && error.code === "ACTION_NOT_FOUND") {
        return jsonError(context, 404, "ACTION_NOT_FOUND", "Action not found");
      }
      if (error instanceof MmdError && error.code === "RECORD_NOT_FOUND") {
        return jsonError(context, 404, "PRODUCT_NOT_FOUND", "Product not found");
      }
      throw error;
    }
  });

  app.notFound((context) =>
    jsonError(context, 404, "NOT_FOUND", "Route not found")
  );
  app.onError((error, context) => {
    if (error instanceof MmdError) {
      const status =
        error.code === "MODEL_NOT_FOUND" ||
        error.code === "RECORD_NOT_FOUND" ||
        error.code === "ACTION_NOT_FOUND"
          ? 404
          : 400;
      return jsonError(context, status, error.code, error.message, error.details);
    }
    console.error(error);
    return jsonError(context, 500, "INTERNAL_ERROR", "Internal server error");
  });

  registerOpenApi(app);
  return app;
}
