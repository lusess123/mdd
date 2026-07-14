"use client";

import Link from "next/link";

import { PageIntro } from "./page-intro";
import { useMmd } from "./mmd-provider";
import type { MessageKey } from "../lib/i18n";

const examples: Array<{
  id: string;
  title: MessageKey;
  description: MessageKey;
  tags: string[];
  file: string;
}> = [
  {
    id: "01",
    title: "examples.basic",
    description: "examples.basicDescription",
    tags: ["Hono", "React", "CRUD"],
    file: "examples/basic",
  },
  {
    id: "02",
    title: "examples.fields",
    description: "examples.fieldsDescription",
    tags: ["money", "tags", "status", "image"],
    file: "examples/custom-fields",
  },
  {
    id: "03",
    title: "examples.actions",
    description: "examples.actionsDescription",
    tags: ["publish", "archive", "duplicate"],
    file: "examples/custom-actions",
  },
  {
    id: "04",
    title: "examples.config",
    description: "examples.configDescription",
    tags: ["API", "auth", "router", "i18n"],
    file: "examples/custom-provider",
  },
];

export function ExamplesContent() {
  const { t } = useMmd();

  return (
    <div className="content-page">
      <PageIntro
        kicker={t("examples.kicker")}
        title={t("examples.title")}
        description={t("examples.description")}
        actions={
          <Link className="button button-primary" href="/playground">
            {t("home.try")} →
          </Link>
        }
      />

      <section className="example-list">
        {examples.map((example) => (
          <article className="example-card" key={example.id}>
            <div className="example-index">{example.id}</div>
            <div className="example-main">
              <div className="example-title-row">
                <h2>{t(example.title)}</h2>
                <span className="example-file">{example.file}</span>
              </div>
              <p>{t(example.description)}</p>
              <div className="example-tags">
                {example.tags.map((tag) => <code key={tag}>{tag}</code>)}
              </div>
            </div>
            <Link className="example-open" href="/playground" aria-label={t(example.title)}>↗</Link>
          </article>
        ))}
      </section>

      <section className="example-flow">
        <span>01 · {t("examples.flowModel")}</span><i>→</i>
        <span>02 · {t("examples.flowApi")}</span><i>→</i>
        <span>03 · {t("examples.flowUi")}</span><i>→</i>
        <span>04 · {t("examples.flowLog")}</span>
      </section>
    </div>
  );
}
