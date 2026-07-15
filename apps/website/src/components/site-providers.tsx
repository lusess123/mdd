"use client";

import { App, ConfigProvider } from "antd";
import type { PropsWithChildren } from "react";

import { MmdProvider } from "./mmd-provider";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_MMD_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://mmd-api.zyking.xyz/api"
    : "http://localhost:8787/api");
const environment = { apiBaseUrl };

export function SiteProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider>
      <App>
        <MmdProvider
          environment={environment}
          api={{ credentials: "include", timeoutMs: 20_000 }}
        >
          {children}
        </MmdProvider>
      </App>
    </ConfigProvider>
  );
}
