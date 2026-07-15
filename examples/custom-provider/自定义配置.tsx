"use client";

import { MmdProvider, MmdRenderer } from "mmd-renderer";

export function CustomProviderExample() {
  return (
    <MmdProvider
      api={{
        baseUrl: "https://mmd-api.zyking.xyz/api",
        timeoutMs: 8_000,
        credentials: "include",
        headers: { "X-App": "mmd-example" },
      }}
      auth={{
        mode: "custom",
        getToken: () => sessionStorage.getItem("access-token"),
        getHeaders: () => ({ "X-Tenant": "tenant-a" }),
      }}
      router={{
        mode: "custom",
        navigate: (path) => window.history.pushState(null, "", path),
      }}
      locale="zh-CN"
      messages={{
        "zh-CN": {
          "models.Product": "商品",
          "actions.publish": "立即发布",
        },
        "en-US": {
          "models.Product": "Products",
          "actions.publish": "Publish now",
        },
      }}
      onError={(error) => console.error("MMD request failed", error)}
      onSuccess={(message) => console.info("MMD", message)}
    >
      <MmdRenderer model="Product" view="listview" />
    </MmdProvider>
  );
}
