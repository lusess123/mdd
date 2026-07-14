import { z } from "@hono/zod-openapi";

export const ProductStatusSchema = z.enum(["draft", "published", "archived"]);

const ProductInputShape = {
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  cover: z.string().url(),
  price: z.number().nonnegative(),
  tags: z.array(z.string().trim().min(1)),
  status: ProductStatusSchema.optional(),
  inventory: z.number().int().nonnegative()
};

export const ProductSchema = z
  .object({
    id: z.string(),
    ...ProductInputShape,
    status: ProductStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .openapi("Product");

export const CreateProductSchema = z
  .object(ProductInputShape)
  .openapi("CreateProductInput");

export const UpdateProductSchema = z
  .object(ProductInputShape)
  .partial()
  .refine(
    (input) => Object.keys(input).length > 0,
    "At least one field is required"
  )
  .openapi("UpdateProductInput");

export const ActionRequestSchema = z
  .object({ ids: z.array(z.string().min(1)).min(1) })
  .openapi("ActionRequest");

export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  status: ProductStatusSchema.optional()
});

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional()
    })
  })
  .openapi("ErrorResponse");

export const ProductResponseSchema = z.object({ data: ProductSchema });

export const ProductListResponseSchema = z.object({
  data: z.array(ProductSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive()
});

export const ActionResponseSchema = z.object({
  action: z.string(),
  affected: z.number().int().nonnegative(),
  data: z.array(ProductSchema)
});

const ActionDefinitionSchema = z.object({
  name: z.string(),
  label: z.string(),
  placement: z.string(),
  tone: z.string().optional(),
  confirm: z.string().optional()
});

export const ModelDefinitionSchema = z.object({
  name: z.string(),
  label: z.string(),
  pluralLabel: z.string(),
  primaryKey: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
      readOnly: z.boolean().optional(),
      list: z.boolean().optional(),
      options: z
        .array(
          z.object({
            label: z.string(),
            value: z.string(),
            color: z.string().optional()
          })
        )
        .optional()
    })
  ),
  actions: z.array(ActionDefinitionSchema)
});

export const MetaResponseSchema = z.object({
  models: z.array(ModelDefinitionSchema),
  actions: z.array(ActionDefinitionSchema)
});
