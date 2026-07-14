import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { productModel } from "mmd-contracts";

import { InMemoryProductStore } from "./store";
import { registerOpenApi } from "./openapi";
import {
  ActionRequestSchema,
  CreateProductSchema,
  ListQuerySchema,
  UpdateProductSchema
} from "./schemas";

type Bindings = {
  CORS_ORIGIN?: string;
};

type AppEnvironment = {
  Bindings: Bindings;
};

export interface CreateAppOptions {
  corsOrigin?: string | string[];
}

function normalizeOrigins(value: string | string[]): string | string[] {
  if (Array.isArray(value) || !value.includes(",")) return value;
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new OpenAPIHono<AppEnvironment>();
  const products = new InMemoryProductStore();

  app.use("*", async (context, next) => {
    const origin = normalizeOrigins(
      options.corsOrigin ?? context.env?.CORS_ORIGIN ?? "*"
    );
    return cors({
      origin,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 86400,
      credentials: origin !== "*"
    })(context, next);
  });

  app.get("/health", (context) => context.json({ status: "ok" }));
  app.get("/api/meta", (context) => {
    const actions = productModel.actions.filter(
      (action, index, all) =>
        all.findIndex((candidate) => candidate.name === action.name) === index
    );

    return context.json({ models: [productModel], actions });
  });
  app.get("/api/products", (context) => {
    const result = ListQuerySchema.safeParse(context.req.query());
    return result.success
      ? context.json(products.list(result.data))
      : context.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request"
            }
          },
          400
        );
  });
  app.get("/api/products/:id", (context) => {
    const product = products.get(context.req.param("id"));
    return product
      ? context.json({ data: product })
      : context.json(
          {
            error: {
              code: "PRODUCT_NOT_FOUND",
              message: "Product not found"
            }
          },
          404
        );
  });
  app.post("/api/products", async (context) => {
    const json = await context.req.json().catch(() => undefined);
    const result = CreateProductSchema.safeParse(json);

    if (!result.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request",
            details: result.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message
            }))
          }
        },
        400
      );
    }

    const product = products.create(result.data);
    return product
      ? context.json({ data: product }, 201)
      : context.json(
          {
            error: {
              code: "SKU_CONFLICT",
              message: "SKU already exists"
            }
          },
          409
        );
  });
  app.patch("/api/products/:id", async (context) => {
    const json = await context.req.json().catch(() => undefined);
    const result = UpdateProductSchema.safeParse(json);

    if (!result.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request"
          }
        },
        400
      );
    }

    const id = context.req.param("id");
    if (!products.get(id)) {
      return context.json(
        {
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found"
          }
        },
        404
      );
    }

    if (result.data.sku && products.hasSku(result.data.sku, id)) {
      return context.json(
        { error: { code: "SKU_CONFLICT", message: "SKU already exists" } },
        409
      );
    }

    const product = products.update(id, result.data);
    return product
      ? context.json({ data: product })
      : context.json(
          {
            error: {
              code: "PRODUCT_NOT_FOUND",
              message: "Product not found"
            }
          },
          404
        );
  });
  app.delete("/api/products/:id", (context) =>
    products.delete(context.req.param("id"))
      ? context.json({ success: true as const })
      : context.json(
          {
            error: {
              code: "PRODUCT_NOT_FOUND",
              message: "Product not found"
            }
          },
          404
        )
  );
  app.post("/api/actions/:action", async (context) => {
    const action = context.req.param("action");
    if (action !== "publish" && action !== "archive" && action !== "duplicate") {
      return context.json(
        { error: { code: "ACTION_NOT_FOUND", message: "Action not found" } },
        404
      );
    }

    const json = await context.req.json().catch(() => undefined);
    const input = ActionRequestSchema.safeParse(json);
    if (!input.success) {
      return context.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request" } },
        400
      );
    }

    const result =
      action === "duplicate"
        ? products.duplicate(input.data.ids)
        : products.setStatus(
            action,
            input.data.ids,
            action === "publish" ? "published" : "archived"
          );
    return result
      ? context.json(result)
      : context.json(
          {
            error: {
              code: "PRODUCT_NOT_FOUND",
              message: "Product not found"
            }
          },
          404
        );
  });

  app.notFound((context) =>
    context.json(
      { error: { code: "NOT_FOUND", message: "Route not found" } },
      404
    )
  );
  app.onError((_error, context) =>
    context.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      500
    )
  );

  registerOpenApi(app);

  return app;
}
