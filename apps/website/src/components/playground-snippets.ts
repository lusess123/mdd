export interface CodeRequest {
  method: string;
  path: string;
  body?: unknown;
}

export const modelCode = `const productModel: ModelDefinition = {
  name: "Product",
  label: "Product",
  pluralLabel: "Products",
  primaryKey: "id",
  fields: [
    { name: "cover", label: "Cover", type: "image" },
    { name: "price", label: "Price", type: "money" },
    { name: "tags", label: "Tags", type: "tags" },
    { name: "status", label: "Status", type: "status" },
  ],
  actions: [
    { name: "publish", label: "Publish", placement: "row" },
    { name: "archive", label: "Archive", placement: "row" },
    { name: "duplicate", label: "Duplicate", placement: "row" },
  ],
};`;

const listCode = `app.get("/api/products", (context) => {
  const input = ListQuerySchema.safeParse(context.req.query());
  return input.success
    ? context.json(products.list(input.data))
    : context.json({
        error: { code: "VALIDATION_ERROR", message: "Invalid request" },
      }, 400);
});`;

const createCode = `app.post("/api/products", async (context) => {
  const json = await context.req.json().catch(() => undefined);
  const input = CreateProductSchema.safeParse(json);
  if (!input.success) {
    return context.json({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    }, 400);
  }

  const product = products.create(input.data);
  return product
    ? context.json({ data: product }, 201)
    : context.json({
        error: { code: "SKU_CONFLICT", message: "SKU already exists" },
      }, 409);
});`;

const updateCode = `app.patch("/api/products/:id", async (context) => {
  const json = await context.req.json().catch(() => undefined);
  const input = UpdateProductSchema.safeParse(json);
  if (!input.success) {
    return context.json({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    }, 400);
  }

  const id = context.req.param("id");
  if (!products.get(id)) {
    return context.json({
      error: { code: "PRODUCT_NOT_FOUND", message: "Product not found" },
    }, 404);
  }

  if (input.data.sku && products.hasSku(input.data.sku, id)) {
    return context.json({
      error: { code: "SKU_CONFLICT", message: "SKU already exists" },
    }, 409);
  }

  const product = products.update(id, input.data);
  return product
    ? context.json({ data: product })
    : context.json({
        error: { code: "PRODUCT_NOT_FOUND", message: "Product not found" },
      }, 404);
});`;

const deleteCode = `app.delete("/api/products/:id", (context) =>
  products.delete(context.req.param("id"))
    ? context.json({ success: true })
    : context.json({
        error: { code: "PRODUCT_NOT_FOUND", message: "Product not found" },
      }, 404),
);`;

const actionCode = `const actionHandlers = {
  publish: (ids) => products.setStatus("publish", ids, "published"),
  archive: (ids) => products.setStatus("archive", ids, "archived"),
  duplicate: (ids) => products.duplicate(ids),
};

app.post("/api/actions/:action", async (context) => {
  const action = context.req.param("action");
  const handler = Object.hasOwn(actionHandlers, action)
    ? actionHandlers[action]
    : undefined;
  if (!handler) {
    return context.json({
      error: { code: "ACTION_NOT_FOUND", message: "Action not found" },
    }, 404);
  }

  const json = await context.req.json().catch(() => undefined);
  const input = ActionRequestSchema.safeParse(json);
  if (!input.success) {
    return context.json({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    }, 400);
  }

  const result = handler(input.data.ids);
  return result
    ? context.json(result)
    : context.json({
        error: { code: "PRODUCT_NOT_FOUND", message: "Product not found" },
      }, 404);
});`;

export function frontendCodeFor(request?: CodeRequest) {
  if (!request) {
    return `const { request } = useMmd();

await request("/products", { method: "GET" });`;
  }

  const body =
    request.body === undefined
      ? ""
      : `\n  body: JSON.stringify(${JSON.stringify(request.body, null, 2)}),`;

  return `const { request } = useMmd();

await request("${request.path}", {
  method: "${request.method}",${body}
});`;
}

export function serverCodeFor(request?: CodeRequest) {
  const method = request?.method ?? "GET";
  const path = request?.path.split("?")[0] ?? "/products";

  if (path.startsWith("/actions/")) return actionCode;
  if (method === "POST") return createCode;
  if (method === "PATCH") return updateCode;
  if (method === "DELETE") return deleteCode;
  return listCode;
}
