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
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#ff7664",
          colorInfo: "#65b9f1",
          colorSuccess: "#4dbb73",
          colorWarning: "#d89b18",
          colorError: "#d94c45",
          colorText: "#25231f",
          colorTextSecondary: "#5f584d",
          colorBgBase: "#fff8e7",
          colorBgContainer: "#fffdf7",
          colorBorder: "#25231f",
          borderRadius: 8,
          fontFamily:
            "var(--font-sans), ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 14,
          controlHeight: 36,
        },
        components: {
          Button: { fontWeight: 600 },
          Table: {
            headerBg: "#ccecff",
            headerColor: "#25231f",
            borderColor: "#25231f",
            rowHoverBg: "#ffedaa",
            cellPaddingBlockSM: 8,
            cellPaddingInlineSM: 10,
          },
          Modal: { contentBg: "#fffdf7", headerBg: "#fffdf7" },
          Input: { activeBorderColor: "#ff7664", hoverBorderColor: "#25231f" },
        },
      }}
    >
      <App>
        <MmdProvider
          environment={environment}
          api={{ credentials: "include" }}
        >
          {children}
        </MmdProvider>
      </App>
    </ConfigProvider>
  );
}
