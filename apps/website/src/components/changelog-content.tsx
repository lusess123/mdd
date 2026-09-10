"use client";
import Link from "next/link";
import { releases } from "../lib/releases";
import { useMmd } from "./mmd-provider";
import { PageIntro } from "./page-intro";

export function ChangelogContent() {
  const { locale } = useMmd();
  const language = locale === "zh-CN" ? "zh" : "en";
  return (
    <div className="content-page">
      <PageIntro
        kicker="CHANGELOG"
        title={
          language === "zh"
            ? "每个版本，都能上手。"
            : "Try what changed in every release."
        }
        description={
          language === "zh"
            ? "查看改动、阅读接入文档，并直接运行对应示例。历史条目链接到当前兼容示例。"
            : "Read the changes, follow the integration guide and run each example. Historical entries link to the current compatible demo."
        }
      />
      {releases.map((release) => (
        <section
          className="doc-section"
          id={`v${release.version}`}
          key={release.version}
        >
          <div className="doc-section-title">
            <span>v{release.version}</span>
            <h2>{release.title[language]}</h2>
          </div>
          <ul>
            {release.features.map((feature) => (
              <li key={feature.id}>
                <p>
                  {feature[language]} ·{" "}
                  <Link href={feature.docs}>
                    {language === "zh" ? "文档" : "Docs"}
                  </Link>{" "}
                  ·{" "}
                  <Link href={feature.demo}>
                    {language === "zh" ? "运行示例" : "Try demo"}
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
