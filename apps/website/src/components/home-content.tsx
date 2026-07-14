"use client";

import Link from "next/link";

import { CodeBlock } from "./code-block";
import { useMmd } from "./mmd-provider";

const modelCode = `const productModel: ModelDefinition = {
  name: "Product",
  label: "Product",
  pluralLabel: "Products",
  primaryKey: "id",
  fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "price", label: "Price", type: "money" },
    { name: "status", label: "Status", type: "status" },
  ],
  actions: [
    { name: "publish", label: "Publish", placement: "row" },
  ],
};`;

const products = [
  { name: "Orbit Keyboard", price: "¥899.00", status: "published" },
  { name: "Signal Dock", price: "¥429.00", status: "draft" },
  { name: "Mono Light", price: "¥1,199.00", status: "archived" },
];

export function HomeContent() {
  const { t } = useMmd();

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="kicker-row">
            <span className="live-dot" />
            <span className="kicker">{t("home.kicker")}</span>
          </div>
          <h1>{t("home.title")}</h1>
          <p>{t("home.description")}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/playground">
              {t("home.try")} <span>→</span>
            </Link>
            <Link className="button" href="/docs">
              {t("home.start")}
            </Link>
          </div>
          <div className="install-line">
            <span>$</span>
            <code>bun install &amp;&amp; bun run dev</code>
            <span className="install-status">{t("home.installReady")}</span>
          </div>
          <div className="hero-stats">
            <div><strong>1</strong><span>{t("home.stat.config")}</span></div>
            <div><strong>4</strong><span>{t("home.stat.crud")}</span></div>
            <div><strong>3+</strong><span>{t("home.stat.extensions")}</span></div>
          </div>
        </div>

        <div className="hero-console">
          <div className="window-bar">
            <div className="window-dots"><span /><span /><span /></div>
            <span>playground / products</span>
            <span className="connection-state"><i /> {t("home.apiConnected")}</span>
          </div>
          <div className="console-tabs">
            <span className="active">{t("home.preview")}</span>
            <span>{t("common.model")}</span>
            <span>{t("common.request")}</span>
          </div>
          <div className="mini-toolbar">
            <span>Products <b>3</b></span>
            <button type="button">+ {t("actions.create")}</button>
          </div>
          <div className="mini-table">
            <div className="mini-row mini-header">
              <span>{t("fields.name")}</span>
              <span>{t("fields.price")}</span>
              <span>{t("fields.status")}</span>
              <span />
            </div>
            {products.map((product) => (
              <div className="mini-row" key={product.name}>
                <span><i className="product-swatch" />{product.name}</span>
                <span className="mono">{product.price}</span>
                <span><em className={`status status-${product.status}`}>{t(`status.${product.status}` as "status.draft")}</em></span>
                <span className="row-action">•••</span>
              </div>
            ))}
          </div>
          <div className="console-log">
            <span className="log-time">12:48:03</span>
            <span className="log-method">GET</span>
            <code>/api/products</code>
            <span className="log-ok">200 · 18ms</span>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <span className="section-index">01</span>
          <div>
            <h2>{t("home.pipeline")}</h2>
            <p>{t("home.pipelineDescription")}</p>
          </div>
        </div>
        <div className="pipeline-grid">
          <CodeBlock code={modelCode} label="product.model.ts" compact />
          <div className="pipeline-steps">
            <article><span>01</span><div><code>mmd-contracts · {t("home.current")}</code><p>{t("home.contracts")}</p></div></article>
            <article><span>02</span><div><code>mmd-engine · {t("home.planned")}</code><p>{t("home.engine")}</p></div></article>
            <article><span>03</span><div><code>mmd-renderer · {t("home.planned")}</code><p>{t("home.renderer")}</p></div></article>
          </div>
        </div>
      </section>

      <section className="feature-grid section-block">
        {[
          ["EX", "home.extension", "home.extensionDescription"],
          ["00", "home.zeroConfig", "home.zeroConfigDescription"],
          ["API", "home.realBackend", "home.realBackendDescription"],
        ].map(([icon, title, description]) => (
          <article className="feature-card" key={title}>
            <span className="feature-icon">{icon}</span>
            <h3>{t(title as "home.extension")}</h3>
            <p>{t(description as "home.extensionDescription")}</p>
          </article>
        ))}
      </section>
    </>
  );
}
