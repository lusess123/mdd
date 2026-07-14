import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Env } from "hono";

import {
  ActionRequestSchema,
  ActionResponseSchema,
  CreateProductSchema,
  ErrorResponseSchema,
  ListQuerySchema,
  MetaResponseSchema,
  ProductListResponseSchema,
  ProductResponseSchema,
  UpdateProductSchema
} from "./schemas";

const idParams = z.object({
  id: z.string().min(1).openapi({
    param: { name: "id", in: "path" },
    example: "product-1001"
  })
});

const actionParams = z.object({
  action: z.string().min(1).openapi({
    param: { name: "action", in: "path" },
    example: "publish"
  })
});

const json = <Schema extends z.ZodType>(schema: Schema) => ({
  content: { "application/json": { schema } }
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  responses: {
    200: {
      ...json(z.object({ status: z.literal("ok") })),
      description: "Service is healthy"
    }
  }
});

const metaRoute = createRoute({
  method: "get",
  path: "/api/meta",
  tags: ["Metadata"],
  responses: {
    200: { ...json(MetaResponseSchema), description: "MMD model metadata" }
  }
});

const listProductsRoute = createRoute({
  method: "get",
  path: "/api/products",
  tags: ["Products"],
  request: { query: ListQuerySchema },
  responses: {
    200: { ...json(ProductListResponseSchema), description: "Product list" },
    400: { ...json(ErrorResponseSchema), description: "Invalid query" }
  }
});

const getProductRoute = createRoute({
  method: "get",
  path: "/api/products/{id}",
  tags: ["Products"],
  request: { params: idParams },
  responses: {
    200: { ...json(ProductResponseSchema), description: "Product details" },
    404: { ...json(ErrorResponseSchema), description: "Product not found" }
  }
});

const createProductRoute = createRoute({
  method: "post",
  path: "/api/products",
  tags: ["Products"],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateProductSchema } }
    }
  },
  responses: {
    201: { ...json(ProductResponseSchema), description: "Product created" },
    400: { ...json(ErrorResponseSchema), description: "Invalid product" },
    409: { ...json(ErrorResponseSchema), description: "SKU already exists" }
  }
});

const updateProductRoute = createRoute({
  method: "patch",
  path: "/api/products/{id}",
  tags: ["Products"],
  request: {
    params: idParams,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateProductSchema } }
    }
  },
  responses: {
    200: { ...json(ProductResponseSchema), description: "Product updated" },
    400: { ...json(ErrorResponseSchema), description: "Invalid product" },
    404: { ...json(ErrorResponseSchema), description: "Product not found" },
    409: { ...json(ErrorResponseSchema), description: "SKU already exists" }
  }
});

const deleteProductRoute = createRoute({
  method: "delete",
  path: "/api/products/{id}",
  tags: ["Products"],
  request: { params: idParams },
  responses: {
    200: {
      ...json(z.object({ success: z.literal(true) })),
      description: "Product deleted"
    },
    404: { ...json(ErrorResponseSchema), description: "Product not found" }
  }
});

const executeActionRoute = createRoute({
  method: "post",
  path: "/api/actions/{action}",
  tags: ["Actions"],
  request: {
    params: actionParams,
    body: {
      required: true,
      content: { "application/json": { schema: ActionRequestSchema } }
    }
  },
  responses: {
    200: { ...json(ActionResponseSchema), description: "Action result" },
    400: { ...json(ErrorResponseSchema), description: "Invalid action request" },
    404: { ...json(ErrorResponseSchema), description: "Action or product not found" }
  }
});

const routes = [
  healthRoute,
  metaRoute,
  listProductsRoute,
  getProductRoute,
  createProductRoute,
  updateProductRoute,
  deleteProductRoute,
  executeActionRoute
];

export function registerOpenApi<Environment extends Env>(
  app: OpenAPIHono<Environment>
) {
  for (const route of routes) app.openAPIRegistry.registerPath(route);

  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "MMD Demo API",
      version: "0.1.0",
      description: "Live Hono API used by the MMD documentation and playground."
    }
  });
}
