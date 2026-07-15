"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

import { useMmd } from "./mmd-provider";
import type { MessageKey } from "../lib/i18n";
import { isNavigationActive } from "../lib/navigation";

const navigation: Array<{ href: string; label: MessageKey }> = [
  { href: "/", label: "nav.home" },
  { href: "/docs", label: "nav.docs" },
  { href: "/examples", label: "nav.examples" },
  { href: "/playground", label: "nav.playground" },
];

export function SiteShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useMmd();

  return (
    <div className="site-frame">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="MMD home">
          <span className="brand-mark">M</span>
          <span>MMD</span>
          <span className="brand-version">alpha</span>
        </Link>
        <nav className="main-nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active = isNavigationActive(pathname, item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={active ? "active" : undefined}
                href={item.href}
                key={item.href}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        <div className="topbar-actions">
          <button
            className="language-switch"
            onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
            type="button"
            aria-label={t("nav.language")}
          >
            {locale === "zh-CN" ? "EN" : "中文"}
          </button>
          <a
            className="github-link"
            href="https://github.com/lusess123/mdd"
            rel="noreferrer"
            target="_blank"
          >
            <span aria-hidden="true">⌘</span> {t("nav.github")}
          </a>
        </div>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <span>MMD · {t("footer.tagline")}</span>
        <span>Contracts / Engine / Renderer</span>
      </footer>
    </div>
  );
}
