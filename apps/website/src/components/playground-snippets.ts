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
    { name: "name", label: "Name", type: "text", required: true },
    { name: "sku", label: "SKU", type: "text", required: true },
    { name: "price", label: "Price", type: "money", required: true },
    { name: "tags", label: "Tags", type: "tags" },
    { name: "status", label: "Status", type: "status" },
    {
      name: "inventory",
      label: "Inventory",
      type: "inventory-meter",
      required: true,
    },
  ],
  actions: [
    {
      name: "publish",
      label: "Publish",
      placement: "row",
      showExpression: 'row.status === "draft"',
    },
    {
      name: "archive",
      label: "Archive",
      placement: "row",
      confirm: true,
    },
    { name: "duplicate", label: "Duplicate", placement: "row" },
  ],
};`;

const metaCode = `app.post("/api/mmd/meta", async (context) => {
  const input = MetaRequestSchema.parse(await context.req.json());
  return withRuntime(context, async ({ engine }) =>
    context.json(engine.getMeta(input)),
  );
});`;

const listCode = `app.post("/api/mmd/query-list", async (context) => {
  const input = QueryListRequestSchema.parse(await context.req.json());
  return withRuntime(context, async ({ engine }) =>
    context.json(await engine.queryList(input)),
  );
});`;

const getCode = `app.post("/api/mmd/query-one", async (context) => {
  const input = QueryOneRequestSchema.parse(await context.req.json());
  const data = await withRuntime(context, ({ engine }) =>
    engine.queryOne(input),
  );
  return data
    ? context.json({ data })
    : context.json({ error: { code: "RECORD_NOT_FOUND" } }, 404);
});`;

const saveCode = `app.post("/api/mmd/save", async (context) => {
  const input = SaveRequestSchema.parse(await context.req.json());
  return withRuntime(context, async ({ engine }) =>
    context.json({ data: await engine.save(input) }, input.id ? 200 : 201),
  );
});`;

const removeCode = `app.post("/api/mmd/remove", async (context) => {
  const input = RemoveRequestSchema.parse(await context.req.json());
  const ids = input.ids ?? [input.id];
  const data = await withRuntime(context, ({ engine }) =>
    Promise.all(ids.map((id) => engine.remove({ model: input.model, id }))),
  );
  return context.json({ success: true, affected: data.filter(Boolean).length });
});`;

const actionCode = `const actions = {
  publish: changeStatus("published"),
  archive: changeStatus("archived"),
  duplicate: duplicateProduct,
};

app.post("/api/mmd/actions/:action", async (context) => {
  const input = ExecuteActionRequestSchema.parse({
    ...await context.req.json(),
    action: context.req.param("action"),
  });
  return withRuntime(context, async ({ engine }) =>
    context.json(await engine.executeAction(input)),
  );
});`;

export function frontendCodeFor(request?: CodeRequest) {
  if (!request) {
    return `const { client } = useMmd();

await client.list({ model: "Product", page: 1, pageSize: 20 });`;
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
  const path = request?.path.split("?")[0] ?? "/mmd/query-list";

  if (path.includes("/actions/")) return actionCode;
  if (path.endsWith("/meta")) return metaCode;
  if (path.endsWith("/query-one")) return getCode;
  if (path.endsWith("/save")) return saveCode;
  if (path.endsWith("/remove")) return removeCode;
  return listCode;
}
