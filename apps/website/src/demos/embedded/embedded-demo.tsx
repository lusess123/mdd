"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Button, Space } from "antd";
import {
  MmdProvider,
  MmdResourcePage,
  ReferenceProvider,
  createReferenceData,
  withClientLifecycle,
} from "mmd-renderer";
import { useMmd } from "../../components/mmd-provider";
import { PageIntro } from "../../components/page-intro";
import { createDemoAdapter } from "./embedded.adapter";
import { createDemoClient } from "./embedded.client";
import styles from "./embedded-demo.module.css";

const list = {
  appearance: "plain",
  keyFirst: true,
  persistQuery: false,
  initialQuery: { pageSize: 10 },
} satisfies NonNullable<Parameters<typeof MmdResourcePage>[0]["list"]>;

export function EmbeddedDemo() {
  const { locale } = useMmd();
  const text = (zh: string, en: string) => (locale === "zh-CN" ? zh : en);
  const [adapter] = useState(createDemoAdapter);
  const [model, setModel] = useState("Item");
  const [mutations, setMutations] = useState(0);
  const { client, resources, references } = useMemo(() => {
    const { client: base, resources } = createDemoClient(adapter, locale);
    const references = createReferenceData({
      client: base,
      resources: resources.map((resource) => ({
        name: resource.name,
        primaryKey: "id",
        displayField: "name",
      })),
    });
    const client = withClientLifecycle({
      client: base,
      afterMutation: () => {
        references.invalidate();
        setMutations((count) => count + 1);
      },
    });
    return { client, resources, references };
  }, [adapter, locale]);
  const resource = resources.find((resource) => resource.name === model)!;
  return (
    <div className="content-page">
      <PageIntro
        kicker="MMD 0.2.0"
        title={text("内嵌 CRUD 与关联数据", "Embedded CRUD and relations")}
        description={text(
          "筛选、只读编号、精确数值和关联弹窗，直接交给 MMD。",
          "Let MMD handle filters, readonly IDs, exact values and related-record dialogs.",
        )}
        actions={
          <Link className="button button-primary" href="/docs#embedded">
            {text("接入文档", "Integration guide")} →
          </Link>
        }
      />
      <Alert
        type="info"
        showIcon
        title={text("独立演示数据", "Isolated demo data")}
        description={text(
          "本页运行真实 MmdRenderer 和 MmdEngine，适配器仅在内存中保存数据，刷新后重置。数据库与 HTTP 示例请使用原 Product Playground。",
          "This page runs the real MmdRenderer and MmdEngine with an in-memory adapter. Reload to reset. Use the original Product Playground for database and HTTP examples.",
        )}
      />
      <div className={styles.toolbar}>
        <Space wrap>
          {resources.map((resource) => (
            <Button
              key={resource.name}
              type={model === resource.name ? "primary" : "default"}
              onClick={() => setModel(resource.name)}
            >
              {resource.label}
            </Button>
          ))}
        </Space>
        <span role="status" data-testid="mutation-count">
          {text("已完成变更", "Completed mutations")}: {mutations}
        </span>
      </div>
      <p>
        {text(
          "先筛选明细，再点击 Studio 查看分类及其关联明细；在关联列表中新增会自动填写分类。编辑内容后关闭弹窗可体验未保存保护。",
          "Filter the items, then open Studio to inspect its related items. Creating from that list fills the category automatically. Edit a value and close the dialog to try the unsaved-change guard.",
        )}
      </p>
      <MmdProvider client={client} locale={locale}>
        <ReferenceProvider data={references}>
          <div className={styles.surface}>
            <MmdResourcePage
              key={model}
              resource={resource}
              resources={resources}
              view="listview"
              list={list}
            />
          </div>
        </ReferenceProvider>
      </MmdProvider>
    </div>
  );
}
