export type ProductStatus = "draft" | "published" | "archived";

export type FieldType =
  | "text"
  | "image"
  | "money"
  | "tags"
  | "status"
  | "number"
  | "datetime";

export interface FieldOption {
  label: string;
  value: string;
  color?: string;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  readOnly?: boolean;
  list?: boolean;
  options?: FieldOption[];
}

export type ActionPlacement = "page" | "row" | "bulk";
export type ActionTone = "default" | "primary" | "danger";

export interface ActionDefinition {
  name: string;
  label: string;
  placement: ActionPlacement;
  tone?: ActionTone;
  confirm?: string;
}

export interface ModelDefinition {
  name: string;
  label: string;
  pluralLabel: string;
  primaryKey: string;
  fields: FieldDefinition[];
  actions: ActionDefinition[];
}

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
  "name" | "sku" | "cover" | "price" | "tags" | "inventory"
> & {
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

export interface ActionRequest {
  ids: string[];
}

export interface ActionResponse<T> {
  action: string;
  affected: number;
  data: T[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export const productModel: ModelDefinition = {
  name: "Product",
  label: "Product",
  pluralLabel: "Products",
  primaryKey: "id",
  fields: [
    { name: "cover", label: "Cover", type: "image", list: true },
    { name: "name", label: "Name", type: "text", required: true, list: true },
    { name: "sku", label: "SKU", type: "text", required: true, list: true },
    { name: "price", label: "Price", type: "money", required: true, list: true },
    { name: "tags", label: "Tags", type: "tags", list: true },
    {
      name: "status",
      label: "Status",
      type: "status",
      list: true,
      options: [
        { label: "Draft", value: "draft", color: "gold" },
        { label: "Published", value: "published", color: "green" },
        { label: "Archived", value: "archived", color: "default" }
      ]
    },
    { name: "inventory", label: "Inventory", type: "number", required: true, list: true },
    { name: "createdAt", label: "Created", type: "datetime", readOnly: true }
  ],
  actions: [
    { name: "publish", label: "Publish", placement: "row", tone: "primary" },
    {
      name: "archive",
      label: "Archive",
      placement: "row",
      confirm: "Archive this product?"
    },
    { name: "duplicate", label: "Duplicate", placement: "row" },
    { name: "publish", label: "Publish selected", placement: "bulk", tone: "primary" },
    {
      name: "archive",
      label: "Archive selected",
      placement: "bulk",
      confirm: "Archive selected products?"
    }
  ]
};
