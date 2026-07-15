"use client";

import { Button, InputNumber, Progress } from "antd";
import {
  MmdRequestError,
  MmdProvider as MmdRendererProvider,
  MmdRenderer,
  type ActionHandler,
  type FieldRendererProps,
  type MmdRequest
} from "mmd-renderer";
import { useCallback, useMemo, useState } from "react";

import { PageIntro } from "./page-intro";
import { useMmd } from "./mmd-provider";
import {
  frontendCodeFor,
  modelCode,
  serverCodeFor,
  type CodeRequest
} from "./playground-snippets";
import type { MessageKey } from "../lib/i18n";

interface RequestLog extends CodeRequest {
  id: number;
  response?: unknown;
  status: "pending" | "success" | "error";
  duration?: number;
}

type InspectorTab = "model" | "frontend" | "server" | "request" | "response";

function json(value: unknown) {
  return value === undefined
    ? "// No payload yet"
    : JSON.stringify(value, null, 2);
}

function parseRequestBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export function describeRequestFailure(error: unknown) {
  const requestError = error instanceof MmdRequestError ? error : undefined;
  return {
    apiOnline: requestError?.status !== undefined,
    response: {
      error: {
        message: error instanceof Error ? error.message : error,
        ...(requestError?.status === undefined
          ? {}
          : { status: requestError.status }),
        ...(requestError?.code ? { code: requestError.code } : {}),
        ...(requestError?.details === undefined
          ? {}
          : { details: requestError.details }),
      },
    },
  };
}

function InventoryMeter({
  value,
  scene,
  disabled,
  onChange
}: FieldRendererProps<number>) {
  const count = Number(value ?? 0);
  if (scene === "form" || scene === "search") {
    return (
      <InputNumber
        min={0}
        precision={0}
        value={count}
        disabled={disabled}
        style={{ width: "100%" }}
        onChange={(next) => onChange?.(next ?? 0)}
      />
    );
  }

  return (
    <div className="inventory-meter" title={`${count}`}>
      <Progress
        percent={Math.min(100, Math.round((count / 50) * 100))}
        showInfo={false}
        size="small"
        status={count === 0 ? "exception" : "normal"}
      />
      <strong>{count}</strong>
    </div>
  );
}

const duplicateAction: ActionHandler = async (context, action) => {
  const keyField = context.keyField ?? "id";
  const id = context.record?.[keyField];
  if (id === undefined || id === null) return;
  const data = await context.client.executeAction({
    action: action.name ?? "duplicate",
    model: context.model,
    ids: [String(id)],
    row: context.record
  });
  return { data, refresh: true };
};

export function PlaygroundContent() {
  const { config, locale, request, t } = useMmd();
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<number>();
  const [activeTab, setActiveTab] = useState<InspectorTab>("request");
  const [apiOnline, setApiOnline] = useState<boolean>();
  const [retryVersion, setRetryVersion] = useState(0);

  const trackedRequest = useCallback<MmdRequest>(
    async <T,>(path: string, init: RequestInit = {}) => {
      const id = Date.now() + Math.random();
      const method = init.method?.toUpperCase() ?? "GET";
      const body = parseRequestBody(init.body);
      const startedAt = performance.now();
      const pending: RequestLog = {
        id,
        method,
        path,
        body,
        status: "pending"
      };
      setLogs((current) => [pending, ...current].slice(0, 10));
      setSelectedLogId(id);

      try {
        const response = await request<T>(path, init);
        setLogs((current) =>
          current.map((log) =>
            log.id === id
              ? {
                  ...log,
                  response,
                  status: "success",
                  duration: Math.round(performance.now() - startedAt)
                }
              : log
          )
        );
        setApiOnline(true);
        return response;
      } catch (error) {
        const failure = describeRequestFailure(error);
        setLogs((current) =>
          current.map((log) =>
            log.id === id
              ? {
                  ...log,
                  response: failure.response,
                  status: "error",
                  duration: Math.round(performance.now() - startedAt)
                }
              : log
          )
        );
        // 4xx/5xx 说明 API 可达；只有网络或超时错误才标记离线。
        setApiOnline(failure.apiOnline);
        throw error;
      }
    },
    [request]
  );

  const rendererEnvironment = useMemo(
    () => ({ apiBaseUrl: config.api.baseUrl, locale }),
    [config.api.baseUrl, locale]
  );
  const rendererApi = useMemo(
    () => ({ request: trackedRequest, credentials: "include" as const }),
    [trackedRequest]
  );
  const rendererFields = useMemo(
    () => ({
      "inventory-meter": {
        default: InventoryMeter,
        list: InventoryMeter,
        detail: InventoryMeter,
        form: InventoryMeter,
        search: InventoryMeter
      }
    }),
    []
  );
  const rendererActions = useMemo(
    () => ({ duplicate: duplicateAction }),
    []
  );
  const rendererMessages = useMemo(
    () => ({
      "zh-CN": {
        "models.Product": "商品",
        "fields.cover": "图片",
        "fields.name": "名称",
        "fields.sku": "SKU",
        "fields.price": "价格",
        "fields.tags": "标签",
        "fields.status": "状态",
        "fields.inventory": "库存",
        "fields.createdAt": "创建时间",
        "fields.updatedAt": "更新时间",
        "actions.publish": "发布",
        "actions.archive": "归档",
        "actions.duplicate": "复制",
        "options.status.draft": "草稿",
        "options.status.published": "已发布",
        "options.status.archived": "已归档"
      },
      "en-US": {
        "models.Product": "Products",
        "fields.cover": "Cover",
        "fields.name": "Name",
        "fields.sku": "SKU",
        "fields.price": "Price",
        "fields.tags": "Tags",
        "fields.status": "Status",
        "fields.inventory": "Inventory",
        "fields.createdAt": "Created",
        "fields.updatedAt": "Updated",
        "actions.publish": "Publish",
        "actions.archive": "Archive",
        "actions.duplicate": "Duplicate",
        "options.status.draft": "Draft",
        "options.status.published": "Published",
        "options.status.archived": "Archived"
      }
    }),
    []
  );

  const selectedLog =
    logs.find((log) => log.id === selectedLogId) ?? logs[0];
  const inspectorCode: Record<InspectorTab, string> = {
    model: modelCode,
    frontend: frontendCodeFor(selectedLog),
    server: serverCodeFor(selectedLog),
    request: selectedLog
      ? `${selectedLog.method} ${config.api.baseUrl}${selectedLog.path}\n\n${json(selectedLog.body)}`
      : t("playground.emptyLog"),
    response: selectedLog
      ? json(selectedLog.response)
      : t("playground.emptyLog")
  };
  const tabs: Array<[InspectorTab, MessageKey]> = [
    ["model", "common.model"],
    ["frontend", "common.frontend"],
    ["server", "common.server"],
    ["request", "common.request"],
    ["response", "common.response"]
  ];

  return (
    <div className="playground-page">
      <PageIntro
        kicker={t("playground.kicker")}
        title={t("playground.title")}
        description={t("playground.description")}
        actions={
          <div className={`api-indicator ${apiOnline === false ? "offline" : ""}`}>
            <i />
            {apiOnline === false
              ? t("playground.apiOfflineShort")
              : config.api.baseUrl}
          </div>
        }
      />

      {apiOnline === false ? (
        <div className="offline-banner">
          <span>{t("playground.apiOffline")}</span>
          <Button size="small" onClick={() => setRetryVersion((value) => value + 1)}>
            {t("actions.retry")}
          </Button>
        </div>
      ) : null}

      <div className="playground-shell">
        <section className="data-panel metadata-renderer-panel">
          <div className="panel-titlebar">
            <div>
              <span className="panel-path">mmd://models/Product.listview</span>
              <b>LIVE</b>
            </div>
          </div>
          <MmdRendererProvider
            key={retryVersion}
            environment={rendererEnvironment}
            api={rendererApi}
            locale={locale}
            messages={rendererMessages}
            fields={rendererFields}
            actions={rendererActions}
          >
            <MmdRenderer
              model="Product"
              view="listview"
              slots={{
                beforeView: (
                  <div className="demo-extension-note">
                    <strong>inventory-meter</strong>
                    <span>{t("examples.fieldsDescription")}</span>
                  </div>
                )
              }}
            />
          </MmdRendererProvider>
        </section>

        <section className="inspector-panel">
          <div className="inspector-tabs">
            {tabs.map(([tab, label]) => (
              <button
                className={activeTab === tab ? "active" : undefined}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {t(label)}
              </button>
            ))}
          </div>
          <pre className="inspector-code">
            <code>{inspectorCode[activeTab]}</code>
          </pre>
          <div className="request-history">
            <span className="history-title">{t("playground.activity")}</span>
            <div className="history-list">
              {logs.length ? (
                logs.map((log) => (
                  <button
                    className={selectedLog?.id === log.id ? "active" : undefined}
                    key={log.id}
                    type="button"
                    onClick={() => {
                      setSelectedLogId(log.id);
                      setActiveTab("response");
                    }}
                  >
                    <span className={`request-state state-${log.status}`} />
                    <b>{log.method}</b>
                    <code>{log.path}</code>
                    <em>
                      {log.duration === undefined ? "…" : `${log.duration}ms`}
                    </em>
                  </button>
                ))
              ) : (
                <p>{t("playground.emptyLog")}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
