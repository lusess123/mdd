"use client";

import { CodeBlock } from "./code-block";
import { PageIntro } from "./page-intro";
import { useMmd } from "./mmd-provider";

const quickStartCode = `import { MmdProvider, MmdPage } from "mmd-renderer";

export default function Products() {
  return (
    <MmdProvider>
      <MmdPage model="Product" />
    </MmdProvider>
  );
}`;

const providerCode = `<MmdProvider
  api={{
    baseUrl: "https://api.example.com",
    timeoutMs: 8_000,
  }}
  auth={{ mode: "custom", getToken }}
  router={{ mode: "custom", navigate }}
  locale="en-US"
  messages={{
    "en-US": { "feedback.saved": "All set" },
  }}
  onError={reportError}
>
  <MmdPage model="Product" />
</MmdProvider>`;

const fieldCode = `registerFieldType({
  type: "money",
  display: MoneyDisplay,
  editor: MoneyInput,
  filter: MoneyRange,
  validate: (value) => value >= 0,
  serialize: (value) => Math.round(value * 100),
});`;

const actionCode = `registerAction({
  name: "publish",
  placement: "row",
  visible: ({ record }) => record.status === "draft",
  confirm: { title: "Publish this product?" },
  execute: ({ record, api }) =>
    api.action("publish", { ids: [record.id] }),
  success: { refresh: true },
});`;

const serverCode = `const app = new Hono<{ Bindings: Env }>();

app.route("/api", createMmdRouter({
  models: [Product],
  repository: createProductRepository(env.DB),
  actions: [publish, archive, duplicate],
}));

export default app;`;

export function DocsContent() {
  const { t } = useMmd();

  const sections = [
    ["01", "docs.quickStart", quickStartCode, "tsx"],
    ["02", "docs.provider", providerCode, "tsx"],
    ["03", "docs.fields", fieldCode, "typescript"],
    ["04", "docs.actions", actionCode, "typescript"],
    ["05", "docs.server", serverCode, "typescript"],
  ] as const;

  return (
    <div className="content-page">
      <PageIntro
        kicker={t("docs.kicker")}
        title={t("docs.title")}
        description={t("docs.description")}
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

          {sections.map(([index, title, code, language]) => (
            <section className="doc-section" id={`section-${index}`} key={index}>
              <div className="doc-section-title"><span>{index}</span><h2>{t(title)}</h2></div>
              <CodeBlock code={code} label={language} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
