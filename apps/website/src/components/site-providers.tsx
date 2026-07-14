"use client";

import { App, ConfigProvider, theme } from "antd";
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
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#2dd4bf",
          colorInfo: "#60a5fa",
          colorSuccess: "#34d399",
          colorWarning: "#fbbf24",
          colorError: "#fb7185",
          colorBgBase: "#090d12",
          colorBgContainer: "#10161f",
          colorBorder: "#273241",
          borderRadius: 5,
          fontFamily:
            "var(--font-sans), ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 13,
          controlHeight: 32,
        },
        components: {
          Button: { fontWeight: 600 },
          Table: {
            headerBg: "#111923",
            headerColor: "#9cabbc",
            borderColor: "#253141",
            rowHoverBg: "#121c27",
            cellPaddingBlockSM: 7,
            cellPaddingInlineSM: 9,
          },
          Modal: { contentBg: "#10161f", headerBg: "#10161f" },
          Input: { activeBorderColor: "#2dd4bf", hoverBorderColor: "#3d566c" },
        },
      }}
    >
      <App>
        <MmdProvider environment={environment}>{children}</MmdProvider>
      </App>
    </ConfigProvider>
  );
}
