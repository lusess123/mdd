"use client";

import { CodeBlock } from "./code-block";
import { PageIntro } from "./page-intro";
import { useMmd } from "./mmd-provider";

const quickStartCode = `git clone https://github.com/lusess123/mdd.git
cd mdd
bun install
bun run dev

# Website: http://localhost:3000
# API:     http://localhost:8787`;

const providerCode = `import { MmdProvider } from "@/components/mmd-provider";

<MmdProvider
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
  <App />
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

const serverCode = `import { createApp } from "./app";

const app = createApp({
  corsOrigin: "http://localhost:3000",
});

export default app;`;

export function DocsContent() {
  const { config, t } = useMmd();
  const openApiUrl = `${config.api.baseUrl.replace(/\/?api\/?$/, "")}/openapi.json`;

  const sections = [
    ["01", "docs.quickStart", quickStartCode, "shell"],
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
        actions={
          <a
            className="button button-primary"
            href={openApiUrl}
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
