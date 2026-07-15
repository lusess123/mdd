import type { ActionDefinition, ActionResponse } from "./action";
import { ModelFieldType, type FieldDefinition } from "./field";
import { PageStyle, type ModelDefinition } from "./model";

export type ProductStatus = "draft" | "published" | "archived";

export interface Product {
  id: string;
  name: string;
  sku: string;
  cover: string;
  price: number;
  tags: string[];
  status: ProductStatus;
  inventory: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateProductInput = Pick<
  Product,
  "name" | "sku" | "price" | "inventory"
> &
  Partial<Pick<Product, "cover" | "tags">> & {
  status?: ProductStatus;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProductStatus;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

const productFields: FieldDefinition[] = [
  {
    name: "id",
    label: "ID",
    fieldType: ModelFieldType.Key,
    type: "text",
    readOnly: true,
    list: false
  },
  {
    name: "cover",
    label: "Cover",
    fieldType: ModelFieldType.Text,
    type: "image",
    list: true,
    pageStyle: [PageStyle.List, PageStyle.Detail, PageStyle.New, PageStyle.Edit]
  },
  {
    name: "name",
    label: "Name",
    fieldType: ModelFieldType.Text,
    type: "text",
    required: true,
    list: true
  },
  {
    name: "sku",
    label: "SKU",
    fieldType: ModelFieldType.Text,
    type: "text",
    required: true,
    list: true
  },
  {
    name: "price",
    label: "Price",
    fieldType: ModelFieldType.Number,
    type: "money",
    required: true,
    list: true
  },
  {
    name: "tags",
    label: "Tags",
    fieldType: ModelFieldType.Multi,
    type: "tags",
    list: true
  },
  {
    name: "status",
    label: "Status",
    fieldType: ModelFieldType.Single,
    type: "status",
    list: true,
    options: [
      { label: "Draft", value: "draft", color: "gold" },
      { label: "Published", value: "published", color: "green" },
      { label: "Archived", value: "archived", color: "default" }
    ]
  },
  {
    name: "inventory",
    label: "Inventory",
    fieldType: ModelFieldType.Number,
    type: "inventory-meter",
    required: true,
    list: true
  },
  {
    name: "createdAt",
    label: "Created",
    fieldType: ModelFieldType.DateTime,
    type: "datetime",
    readOnly: true,
    list: false,
    pageStyle: [PageStyle.ReadOnly]
  },
  {
    name: "updatedAt",
    label: "Updated",
    fieldType: ModelFieldType.DateTime,
    type: "datetime",
    readOnly: true,
    list: false,
    pageStyle: [PageStyle.ReadOnly]
  }
];

const productActions: ActionDefinition[] = [
  {
    name: "publish",
    label: "Publish",
    placement: "row",
    tone: "primary",
    showExpression: 'row.status === "draft"'
  },
  {
    name: "archive",
    label: "Archive",
    placement: "row",
    confirm: "Archive this product?",
    showExpression: 'row.status !== "archived"'
  },
  { name: "duplicate", label: "Duplicate", placement: "row" },
  { name: "publish", label: "Publish selected", placement: "bulk", tone: "primary" },
  {
    name: "archive",
    label: "Archive selected",
    placement: "bulk",
    confirm: "Archive selected products?"
  }
];

export const productModel = {
  name: "Product",
  label: "Product",
  pluralLabel: "Products",
  primaryKey: "id",
  fields: productFields,
  actions: productActions
} satisfies ModelDefinition;

export type ProductActionResponse = ActionResponse<Product>;
