"use client";

import { MmdProvider, MmdRenderer } from "mmd-renderer";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_MMD_API_URL ?? "http://localhost:8787/api";

export default function ProductAdminPage() {
  return (
    <MmdProvider
      environment={{ apiBaseUrl }}
      api={{ credentials: "include" }}
      messages={{
        "zh-CN": { "models.Product": "商品" },
        "en-US": { "models.Product": "Products" },
      }}
    >
      <MmdRenderer model="Product" view="listview" />
    </MmdProvider>
  );
}
