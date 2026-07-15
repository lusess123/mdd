"use client";

import {
  MmdProvider,
  MmdRenderer,
  type RendererMeta
} from "mmd-renderer";
import { useMemo } from "react";

import { useMmd } from "./mmd-provider";

const previewMeta: RendererMeta = {
  models: {
    Product: {
      name: "Product",
      label: "Product",
      pluralLabel: "Products",
      primaryKey: "id",
      fields: [
        { name: "id", label: "ID", type: "text", readOnly: true },
        { name: "name", label: "Name", type: "text" },
        { name: "price", label: "Price", type: "money" },
        {
          name: "status",
          label: "Status",
          type: "status",
          options: [
            { label: "Draft", value: "draft", color: "gold" },
            { label: "Published", value: "published", color: "green" },
            { label: "Archived", value: "archived", color: "default" }
          ]
        }
      ]
    }
  },
  views: {
    "Product.previewview": {
      name: "Product.previewview",
      label: "Products",
      type: "list",
      dataContainers: [
        {
          name: "Product",
          label: "Products",
          type: "list",
          keyField: "id",
          pageSize: 3,
          fields: [
            { name: "name", label: "Name", type: "text" },
            { name: "price", label: "Price", type: "money" },
            {
              name: "status",
              label: "Status",
              type: "status",
              options: [
                { label: "Draft", value: "draft", color: "gold" },
                { label: "Published", value: "published", color: "green" },
                { label: "Archived", value: "archived", color: "default" }
              ]
            }
          ],
          actions: [
            {
              name: "refresh",
              label: "Refresh",
              type: "refresh",
              placement: "page"
            }
          ]
        }
      ]
    }
  },
  dicts: {}
};

const messages = {
  "zh-CN": {
    "models.Product": "商品",
    "fields.name": "名称",
    "fields.price": "价格",
    "fields.status": "状态",
    "options.status.draft": "草稿",
    "options.status.published": "已发布",
    "options.status.archived": "已归档"
  },
  "en-US": {
    "models.Product": "Products",
    "fields.name": "Name",
    "fields.price": "Price",
    "fields.status": "Status",
    "options.status.draft": "Draft",
    "options.status.published": "Published",
    "options.status.archived": "Archived"
  }
};

export function HomeLiveRenderer() {
  const { config, locale } = useMmd();
  const environment = useMemo(
    () => ({ apiBaseUrl: config.api.baseUrl, locale }),
    [config.api.baseUrl, locale]
  );

  return (
    <MmdProvider
      environment={environment}
      api={{ credentials: "include", timeoutMs: 20_000 }}
      initialMeta={previewMeta}
      locale={locale}
      messages={messages}
    >
      <MmdRenderer model="Product" view="previewview" />
    </MmdProvider>
  );
}
