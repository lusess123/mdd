"use client";

import { useState } from "react";

import { useMmd } from "./mmd-provider";

export function CodeBlock({
  code,
  label,
  compact = false,
}: {
  code: string;
  label?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useMmd();

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className={`code-block${compact ? " code-block-compact" : ""}`}>
      <div className="code-toolbar">
        <span>{label ?? "typescript"}</span>
        <button type="button" onClick={copy}>
          {copied ? t("common.copied") : t("common.copy")}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
