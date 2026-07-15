import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Env } from "hono";

import {
  ActionRequestSchema,
  ActionResponseSchema,
  CreateProductSchema,
  ErrorResponseSchema,
  ExecuteActionRequestSchema,
  ListQuerySchema,
  MetaRequestSchema,
  MetaResponseSchema,
  ProductListResponseSchema,
  ProductResponseSchema,
  QueryListRequestSchema,
  QueryOneRequestSchema,
  RemoveRequestSchema,
  SaveRequestSchema,
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

const genericRecord = z.record(z.string(), z.unknown());
const genericRecordResponse = z.object({ data: genericRecord });
const genericListResponse = z.object({
  data: z.array(genericRecord),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive()
});
const genericMetaResponse = z.object({
  models: z.record(z.string(), z.unknown()),
  views: z.record(z.string(), z.unknown()),
  dicts: z.record(z.string(), z.unknown())
});

const body = <Schema extends z.ZodType>(schema: Schema) => ({
  required: true,
  content: { "application/json": { schema } }
});

const rateLimitResponse = {
  429: { ...json(ErrorResponseSchema), description: "Request rate limit exceeded" }
};

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
    ...rateLimitResponse,
    200: { ...json(MetaResponseSchema), description: "MMD model metadata" }
  }
});

const mmdMetaRoute = createRoute({
  method: "post",
  path: "/api/mmd/meta",
  tags: ["MMD"],
  request: { body: body(MetaRequestSchema) },
  responses: {
    ...rateLimitResponse,
    200: { ...json(genericMetaResponse), description: "Models, views and dictionaries" },
    400: { ...json(ErrorResponseSchema), description: "Invalid metadata request" }
  }
});

const mmdQueryListRoute = createRoute({
  method: "post",
  path: "/api/mmd/query-list",
  tags: ["MMD"],
  request: { body: body(QueryListRequestSchema) },
  responses: {
    ...rateLimitResponse,
    200: { ...json(genericListResponse), description: "Metadata-driven list query" },
    400: { ...json(ErrorResponseSchema), description: "Invalid or unsafe query" },
    404: { ...json(ErrorResponseSchema), description: "Model not found" }
  }
});

const mmdQueryOneRoute = createRoute({
  method: "post",
  path: "/api/mmd/query-one",
  tags: ["MMD"],
  request: { body: body(QueryOneRequestSchema) },
  responses: {
    ...rateLimitResponse,
    200: { ...json(genericRecordResponse), description: "One record" },
    400: { ...json(ErrorResponseSchema), description: "Invalid query" },
    404: { ...json(ErrorResponseSchema), description: "Record not found" }
  }
});

const mmdSaveRoute = createRoute({
  method: "post",
  path: "/api/mmd/save",
  tags: ["MMD"],
  request: { body: body(SaveRequestSchema) },
  responses: {
    ...rateLimitResponse,
    200: { ...json(genericRecordResponse), description: "Record updated" },
    201: { ...json(genericRecordResponse), description: "Record created" },
    400: { ...json(ErrorResponseSchema), description: "Invalid record" },
    409: {
      ...json(ErrorResponseSchema),
      description: "Unique value conflict or demo session record limit"
    }
  }
});

const mmdRemoveRoute = createRoute({
  method: "post",
  path: "/api/mmd/remove",
  tags: ["MMD"],
  request: { body: body(RemoveRequestSchema) },
  responses: {
    ...rateLimitResponse,
    200: {
      ...json(
        z.object({
          success: z.literal(true),
          affected: z.number().int().positive(),
          data: z.array(genericRecord)
        })
      ),
      description: "Record removed"
    },
    400: { ...json(ErrorResponseSchema), description: "Invalid remove request" },
    404: { ...json(ErrorResponseSchema), description: "Record not found" }
  }
});

const mmdActionRoute = createRoute({
  method: "post",
  path: "/api/mmd/actions/{action}",
  tags: ["MMD"],
  request: {
    params: actionParams,
    body: body(ExecuteActionRequestSchema.omit({ action: true }))
  },
  responses: {
    ...rateLimitResponse,
    200: {
      ...json(
        z.object({
          action: z.string(),
          affected: z.number().int().nonnegative(),
          data: z.array(genericRecord)
        })
      ),
      description: "Custom action result"
    },
    400: { ...json(ErrorResponseSchema), description: "Invalid action request" },
    409: { ...json(ErrorResponseSchema), description: "Demo session record limit" },
    404: { ...json(ErrorResponseSchema), description: "Action or record not found" }
  }
});

const listProductsRoute = createRoute({
  method: "get",
  path: "/api/products",
  tags: ["Products"],
  request: { query: ListQuerySchema },
  responses: {
    ...rateLimitResponse,
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
    ...rateLimitResponse,
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
    ...rateLimitResponse,
    201: { ...json(ProductResponseSchema), description: "Product created" },
    400: { ...json(ErrorResponseSchema), description: "Invalid product" },
    409: {
      ...json(ErrorResponseSchema),
      description: "SKU conflict or demo session record limit"
    }
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
    ...rateLimitResponse,
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
    ...rateLimitResponse,
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
    ...rateLimitResponse,
    200: { ...json(ActionResponseSchema), description: "Action result" },
    400: { ...json(ErrorResponseSchema), description: "Invalid action request" },
    409: { ...json(ErrorResponseSchema), description: "Demo session record limit" },
    404: { ...json(ErrorResponseSchema), description: "Action or product not found" }
  }
});

const routes = [
  healthRoute,
  metaRoute,
  mmdMetaRoute,
  mmdQueryListRoute,
  mmdQueryOneRoute,
  mmdSaveRoute,
  mmdRemoveRoute,
  mmdActionRoute,
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
      title: "MMD API Reference",
      version: "0.1.0",
      description:
        "Metadata-driven protocol shared by mmd-renderer and mmd-engine. Product routes are a live example implementation."
    }
  });
}
