import { z } from "@hono/zod-openapi";

export const ProductStatusSchema = z.enum(["draft", "published", "archived"]);

const ProductCoverSchema = z.union([z.literal(""), z.string().url()]);

const ProductInputShape = {
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  cover: ProductCoverSchema,
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
  .object({
    ...ProductInputShape,
    cover: ProductCoverSchema.optional().default(""),
    tags: ProductInputShape.tags.optional().default([]),
    status: ProductStatusSchema.optional().default("draft")
  })
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
  .object({
    ids: z.array(z.string().min(1)).min(1),
    payload: z.unknown().optional()
  })
  .openapi("ActionRequest");

const ModelNameSchema = z.string().trim().min(1);
const FieldsSchema = z.array(z.string().trim().min(1)).min(1).optional();
const DataSchema = z.record(z.string(), z.unknown());

export const MetaRequestSchema = z
  .object({
    models: z.array(ModelNameSchema).optional(),
    views: z.array(ModelNameSchema).optional(),
    dicts: z.array(ModelNameSchema).optional(),
    hasModels: z.array(ModelNameSchema).optional(),
    hasViews: z.array(ModelNameSchema).optional(),
    hasCiews: z.array(ModelNameSchema).optional(),
    hasDicts: z.array(ModelNameSchema).optional()
  })
  .openapi("MmdMetaRequest");

export const QueryListRequestSchema = z
  .object({
    model: ModelNameSchema,
    fields: FieldsSchema,
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(100).optional(),
    where: DataSchema.optional(),
    search: DataSchema.optional(),
    filters: z
      .array(
        z.object({
          field: z.string().trim().min(1),
          operator: z.enum(["eq", "contains", "in", "gte", "lte"]),
          value: z.unknown()
        })
      )
      .optional(),
    sort: z
      .array(
        z.object({
          field: z.string().trim().min(1),
          direction: z.enum(["asc", "desc"])
        })
      )
      .optional()
  })
  .openapi("MmdQueryListRequest");

export const QueryOneRequestSchema = z
  .object({
    model: ModelNameSchema,
    id: z.string().min(1),
    fields: FieldsSchema
  })
  .openapi("MmdQueryOneRequest");

export const SaveRequestSchema = z
  .object({
    model: ModelNameSchema,
    id: z.string().min(1).optional(),
    data: DataSchema
  })
  .openapi("MmdSaveRequest");

export const RemoveRequestSchema = z
  .object({
    model: ModelNameSchema,
    id: z.string().min(1).optional(),
    ids: z.array(z.string().min(1)).min(1).optional()
  })
  .refine((input) => Boolean(input.id || input.ids?.length), {
    message: "id or ids is required"
  })
  .openapi("MmdRemoveRequest");

export const ExecuteActionRequestSchema = z
  .object({
    model: ModelNameSchema,
    action: z.string().trim().min(1),
    ids: z.array(z.string().min(1)).min(1),
    payload: z.unknown().optional(),
    row: DataSchema.optional()
  })
  .openapi("MmdExecuteActionRequest");

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
  confirm: z.union([z.boolean(), z.string()]).optional()
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
