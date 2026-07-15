"use client";

import Link from "next/link";

import { installCommands } from "../lib/install-commands";
import { CodeBlock } from "./code-block";
import { HomeLiveRenderer } from "./home-live-renderer";
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
    { name: "inventory", label: "Inventory", type: "inventory-meter" },
  ],
  actions: [
    {
      name: "publish",
      label: "Publish",
      placement: "row",
      showExpression: 'row.status === "draft"',
    },
    { name: "duplicate", label: "Duplicate", placement: "row" },
  ],
};`;

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
            <div className="install-commands">
              {installCommands.map((command) => (
                <div className="install-command" key={command}>
                  <span>$</span>
                  <code>{command}</code>
                </div>
              ))}
            </div>
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
            <span>mmd://Product.previewview</span>
            <span className="connection-state"><i /> {t("home.apiConnected")}</span>
          </div>
          <div className="hero-renderer">
            <HomeLiveRenderer />
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
            <article><span>02</span><div><code>mmd-engine · {t("home.current")}</code><p>{t("home.engine")}</p></div></article>
            <article><span>03</span><div><code>mmd-renderer · {t("home.current")}</code><p>{t("home.renderer")}</p></div></article>
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
