"use client";

import { CodeBlock } from "./code-block";
import { PageIntro } from "./page-intro";
import { useMmd } from "./mmd-provider";

const installCode = `bun add mmd-contracts mmd-engine mmd-renderer`;

const modelCode = `import type { ModelDefinition } from "mmd-contracts";

export const productModel: ModelDefinition = {
  name: "Product",
  label: "Product",
  pluralLabel: "Products",
  primaryKey: "id",
  fields: [
    { name: "id", label: "ID", type: "text", readOnly: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "price", label: "Price", type: "money", required: true },
    { name: "inventory", label: "Inventory", type: "inventory-meter", required: true },
  ],
  actions: [
    { name: "duplicate", label: "Duplicate", type: "custom", placement: "row" },
  ],
};`;

const providerCode = `import { MmdProvider, MmdRenderer } from "mmd-renderer";

<MmdProvider
  api={{
    baseUrl: "https://api.example.com/api",
    timeoutMs: 8_000,
    credentials: "include",
  }}
  auth={{ mode: "custom", getToken }}
  router={{ mode: "custom", navigate }}
  locale="en-US"
  messages={{
    "en-US": { "feedback.saved": "All set" },
  }}
  onError={reportError}
>
  <MmdRenderer model="Product" view="listview" />
</MmdProvider>`;

const fieldCode = `import { InputNumber, Progress } from "antd";
import {
  MmdProvider,
  MmdRenderer,
  type FieldRendererProps,
} from "mmd-renderer";

function InventoryMeter({ value, scene, onChange }: FieldRendererProps) {
  if (scene === "form" || scene === "search") {
    return (
      <InputNumber
        min={0}
        value={Number(value ?? 0)}
        onChange={(next) => onChange?.(next ?? 0)}
      />
    );
  }
  return <Progress percent={Math.min(100, Number(value ?? 0) * 2)} />;
}

<MmdProvider
  fields={{
    "inventory-meter": {
      list: InventoryMeter,
      detail: InventoryMeter,
      form: InventoryMeter,
      search: InventoryMeter,
    },
  }}
>
  <MmdRenderer model="Product" view="listview" />
</MmdProvider>`;

const actionCode = `import {
  MmdProvider,
  MmdRenderer,
  type ActionHandler,
} from "mmd-renderer";

const duplicate: ActionHandler = async (context, action) => {
  const id = context.record?.[context.keyField ?? "id"];
  if (id == null) return;

  const data = await context.client.executeAction({
    model: context.model,
    action: action.name ?? "duplicate",
    ids: [String(id)],
  });
  return { data, refresh: true };
};

<MmdProvider actions={{ duplicate }}>
  <MmdRenderer model="Product" view="listview" />
</MmdProvider>`;

const serverCode = `import { Hono } from "hono";
import type { MetaRequest } from "mmd-contracts";
import {
  MmdEngine,
  MmdRegistry,
  type MmdActionHandler,
  type ExecuteActionRequest,
  type QueryListRequest,
  type QueryOneRequest,
  type SaveRequest,
} from "mmd-engine";
import { productAdapter } from "./product.adapter";
import { productModel } from "./product.model";

const registry = new MmdRegistry().registerModel(productModel);
const duplicate: MmdActionHandler = async ({ ids, engine, model }) => {
  const data: Record<string, unknown>[] = [];
  for (const id of ids) {
    const source = await engine.queryOne({ model: model.name, id });
    if (!source) continue;
    data.push(await engine.save({
      model: model.name,
      data: {
        name: String(source.name) + " (Copy)",
        price: source.price,
        inventory: source.inventory,
      },
    }));
  }
  return { affected: data.length, data };
};

const engine = new MmdEngine({
  registry,
  adapter: productAdapter,
  actions: { duplicate },
});
const app = new Hono();

app.post("/api/mmd/meta", async (c) => {
  const input = await c.req.json<MetaRequest>();
  return c.json(engine.getMeta(input));
});
app.post("/api/mmd/query-list", async (c) => {
  const input = await c.req.json<QueryListRequest>();
  return c.json(await engine.queryList(input));
});
app.post("/api/mmd/query-one", async (c) => {
  const input = await c.req.json<QueryOneRequest>();
  return c.json({ data: await engine.queryOne(input) });
});
app.post("/api/mmd/save", async (c) => {
  const input = await c.req.json<SaveRequest>();
  return c.json({ data: await engine.save(input) });
});
app.post("/api/mmd/remove", async (c) => {
  const input = await c.req.json<{
    model: string;
    id?: string;
    ids?: string[];
  }>();
  const ids = input.ids ?? (input.id ? [input.id] : []);
  const data = (await Promise.all(
    ids.map((id) => engine.remove({ model: input.model, id }))
  )).filter(Boolean);
  return c.json({ success: true, affected: data.length, data });
});
app.post("/api/mmd/actions/:action", async (c) => {
  const input = await c.req.json<Omit<ExecuteActionRequest, "action">>();
  return c.json(await engine.executeAction({
    ...input,
    action: c.req.param("action"),
  }));
});

export default app;`;

const protocolCode = `POST /api/mmd/meta
POST /api/mmd/query-list
POST /api/mmd/query-one
POST /api/mmd/save
POST /api/mmd/remove
POST /api/mmd/actions/:action

# Interactive OpenAPI reference
GET  https://mmd-api.zyking.xyz/docs`;

export function DocsContent() {
  const { config, t } = useMmd();
  const apiDocsUrl = `${config.api.baseUrl.replace(/\/?api\/?$/, "")}/docs`;

  const sections = [
    ["01", "docs.quickStart", [
      { code: installCode, label: "shell" },
      { code: modelCode, label: "product.model.ts" },
    ]],
    ["02", "docs.provider", [{ code: providerCode, label: "tsx" }]],
    ["03", "docs.fields", [{ code: fieldCode, label: "typescript" }]],
    ["04", "docs.actions", [{ code: actionCode, label: "typescript" }]],
    ["05", "docs.server", [{ code: serverCode, label: "typescript" }]],
    ["06", "docs.protocol", [{ code: protocolCode, label: "http" }]],
  ] as const;

  return (
    <div className="content-page">
      <PageIntro
        kicker={t("docs.kicker")}
        title={t("docs.title")}
        description={t("docs.description")}
        actions={
          <a
            className="button button-primary"
            href={apiDocsUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("docs.openApi")} ↗
          </a>
        }
      />

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <span className="sidebar-label">{t("docs.contents")}</span>
          {sections.map(([index, title]) => (
            <a href={`#section-${index}`} key={index}>
              <span>{index}</span>{t(title)}
            </a>
          ))}
          <div className="sidebar-status">
            <span className="live-dot" />
            {t("docs.referenceStatus")}
          </div>
        </aside>

        <div className="docs-body">
          <section className="docs-notice">
            <strong>{t("docs.noticeTitle")}</strong>
            <span>{t("docs.noticeDescription")}</span>
          </section>
          <section className="default-panel">
            <div className="default-panel-head">
              <div>
                <span className="eyebrow">{t("docs.zeroConfig")}</span>
                <h2>{t("docs.defaultBehavior")}</h2>
              </div>
              <code>{t("docs.priority")}</code>
            </div>
            <div className="default-grid">
              {[
                ["API", "docs.defaultApi"],
                ["AUTH", "docs.defaultAuth"],
                ["ROUTE", "docs.defaultRouter"],
                ["ERROR", "docs.defaultError"],
              ].map(([label, description]) => (
                <div key={label}><span>{label}</span><p>{t(description as "docs.defaultApi")}</p></div>
              ))}
            </div>
          </section>

          {sections.map(([index, title, blocks]) => (
            <section className="doc-section" id={`section-${index}`} key={index}>
              <div className="doc-section-title"><span>{index}</span><h2>{t(title)}</h2></div>
              {blocks.map(({ code, label }) => (
                <CodeBlock code={code} label={label} key={label} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
