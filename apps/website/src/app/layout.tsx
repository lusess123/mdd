import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteProviders } from "../components/site-providers";
import { SiteShell } from "../components/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MMD — Metadata-driven admin",
    template: "%s · MMD",
  },
  description:
    "Build extensible CRUD interfaces from a shared model definition with Hono and React.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html data-scroll-behavior="smooth" lang="zh-CN">
      <body>
        <SiteProviders>
          <SiteShell>{children}</SiteShell>
        </SiteProviders>
      </body>
    </html>
  );
}
