"use client";

import Image from "next/image";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  type TableColumnsType,
} from "antd";
import type {
  ActionResponse,
  ListResponse,
  Product,
  ProductStatus,
} from "mmd-contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageIntro } from "./page-intro";
import { useMmd } from "./mmd-provider";
import {
  frontendCodeFor,
  modelCode,
  serverCodeFor,
  type CodeRequest,
} from "./playground-snippets";
import type { MessageKey } from "../lib/i18n";

type ProductInput = Pick<
  Product,
  "name" | "sku" | "cover" | "price" | "tags" | "status" | "inventory"
>;

interface ProductResponse {
  data: Product;
}

interface RequestLog extends CodeRequest {
  id: number;
  response?: unknown;
  status: "pending" | "success" | "error";
  duration?: number;
}

type InspectorTab = "model" | "frontend" | "server" | "request" | "response";

const statusColors: Record<ProductStatus, string> = {
  draft: "gold",
  published: "green",
  archived: "default",
};

const defaultCover =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=128&h=128&fit=crop";

const emptyProduct: ProductInput = {
  name: "",
  sku: "",
  cover: defaultCover,
  price: 0,
  tags: [],
  status: "draft",
  inventory: 0,
};

function json(value: unknown) {
  return value === undefined
    ? "// No payload yet"
    : JSON.stringify(value, null, 2);
}

export function PlaygroundContent() {
  const { config, locale, notifySuccess, request, t } = useMmd();
  const [form] = Form.useForm<ProductInput>();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProductStatus | undefined>();
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState<boolean>();
  const [editing, setEditing] = useState<Product>();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<number>();
  const [activeTab, setActiveTab] = useState<InspectorTab>("request");

  const trackedRequest = useCallback(
    async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
      const id = Date.now();
      const startedAt = performance.now();
      const pendingLog: RequestLog = {
        id,
        method,
        path,
        body,
        status: "pending",
      };
      setLogs((current) => [
        pendingLog,
        ...current,
      ].slice(0, 8));
      setSelectedLogId(id);

      try {
        const response = await request<T>(path, {
          method,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        setLogs((current) =>
          current.map((log) =>
            log.id === id
              ? {
                  ...log,
                  response,
                  status: "success",
                  duration: Math.round(performance.now() - startedAt),
                }
              : log,
          ),
        );
        setApiOnline(true);
        return response;
      } catch (error) {
        setLogs((current) =>
          current.map((log) =>
            log.id === id
              ? {
                  ...log,
                  response: { error: error instanceof Error ? error.message : error },
                  status: "error",
                  duration: Math.round(performance.now() - startedAt),
                }
              : log,
          ),
        );
        setApiOnline(false);
        throw error;
      }
    },
    [request],
  );

  const loadProducts = useCallback(
    async (nextQuery = "", nextStatus?: ProductStatus) => {
      setLoading(true);
      const parameters = new URLSearchParams();
      if (nextQuery) parameters.set("search", nextQuery);
      if (nextStatus) parameters.set("status", nextStatus);

      try {
        const suffix = parameters.size ? `?${parameters}` : "";
        const result = await trackedRequest<ListResponse<Product>>(
          "GET",
          `/products${suffix}`,
        );
        setProducts(result.data);
        setTotal(result.total);
      } catch {
        setProducts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [trackedRequest],
  );

  useEffect(() => {
    void loadProducts("", undefined);
  }, [loadProducts]);

  useEffect(() => {
    if (!modalOpen) return;
    form.setFieldsValue(editing ?? emptyProduct);
  }, [editing, form, modalOpen]);

  function openCreate() {
    setEditing(undefined);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setModalOpen(true);
  }

  async function saveProduct() {
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;
    setSaving(true);
    try {
      if (editing) {
        await trackedRequest<ProductResponse>(
          "PATCH",
          `/products/${editing.id}`,
          values,
        );
      } else {
        await trackedRequest<ProductResponse>("POST", "/products", values);
      }
      notifySuccess(t("feedback.saved"));
      setModalOpen(false);
      await loadProducts(query, status);
    } catch {
      // MmdProvider already renders the localized error feedback.
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    try {
      await trackedRequest<{ success: true }>("DELETE", `/products/${product.id}`);
      notifySuccess(t("feedback.deleted"));
      await loadProducts(query, status);
    } catch {
      // MmdProvider already renders the localized error feedback.
    }
  }

  async function runAction(action: string, product: Product) {
    try {
      await trackedRequest<ActionResponse<Product>>("POST", `/actions/${action}`, {
        ids: [product.id],
      });
      notifySuccess(t("feedback.actionDone"));
      await loadProducts(query, status);
    } catch {
      // MmdProvider already renders the localized error feedback.
    }
  }

  const columns = useMemo<TableColumnsType<Product>>(
    () => [
      {
        title: t("fields.name"),
        key: "name",
        width: 240,
        render: (_, product) => (
          <div className="product-cell">
            <Image
              alt=""
              className="product-cover"
              height={34}
              src={product.cover || defaultCover}
              unoptimized
              width={34}
            />
            <div><strong>{product.name}</strong><code>{product.sku}</code></div>
          </div>
        ),
      },
      {
        title: t("fields.price"),
        dataIndex: "price",
        width: 110,
        render: (price: number) => (
          <span className="money-field">
            {new Intl.NumberFormat(locale, {
              style: "currency",
              currency: "CNY",
            }).format(price)}
          </span>
        ),
      },
      {
        title: t("fields.tags"),
        dataIndex: "tags",
        render: (tags: string[]) => (
          <Space size={[3, 3]} wrap>
            {tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
          </Space>
        ),
      },
      {
        title: t("fields.status"),
        dataIndex: "status",
        width: 105,
        render: (value: ProductStatus) => (
          <Tag color={statusColors[value]}>{t(`status.${value}` as MessageKey)}</Tag>
        ),
      },
      {
        title: t("fields.inventory"),
        dataIndex: "inventory",
        align: "right",
        width: 85,
        render: (value: number) => <span className="mono">{value}</span>,
      },
      {
        title: "",
        key: "actions",
        fixed: "right",
        width: 238,
        render: (_, product) => (
          <Space size={3}>
            {product.status === "draft" ? (
              <Popconfirm
                title={t("playground.actionConfirm")}
                onConfirm={() => runAction("publish", product)}
              >
                <Button size="small" type="link">{t("actions.publish")}</Button>
              </Popconfirm>
            ) : null}
            {product.status !== "archived" ? (
              <Popconfirm
                title={t("playground.actionConfirm")}
                onConfirm={() => runAction("archive", product)}
              >
                <Button size="small" type="link">{t("actions.archive")}</Button>
              </Popconfirm>
            ) : null}
            <Button size="small" type="link" onClick={() => runAction("duplicate", product)}>
              {t("actions.duplicate")}
            </Button>
            <Button size="small" type="text" onClick={() => openEdit(product)}>
              {t("actions.edit")}
            </Button>
            <Popconfirm
              title={t("playground.deleteConfirm")}
              onConfirm={() => deleteProduct(product)}
            >
              <Button danger size="small" type="text">{t("actions.delete")}</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [loadProducts, locale, notifySuccess, query, status, t, trackedRequest],
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
    response: selectedLog ? json(selectedLog.response) : t("playground.emptyLog"),
  };

  const tabs: Array<[InspectorTab, MessageKey]> = [
    ["model", "common.model"],
    ["frontend", "common.frontend"],
    ["server", "common.server"],
    ["request", "common.request"],
    ["response", "common.response"],
  ];

  return (
    <div className="playground-page">
      <PageIntro
        kicker={t("playground.kicker")}
        title={t("playground.title")}
        description={t("playground.description")}
        actions={
          <div className={`api-indicator ${apiOnline === false ? "offline" : ""}`}>
            <i /> {apiOnline === false ? t("playground.apiOfflineShort") : `${config.api.baseUrl}`}
          </div>
        }
      />

      {apiOnline === false ? (
        <div className="offline-banner">
          <span>{t("playground.apiOffline")}</span>
          <Button size="small" onClick={() => loadProducts(query, status)}>{t("actions.retry")}</Button>
        </div>
      ) : null}

      <div className="playground-shell">
        <section className="data-panel">
          <div className="panel-titlebar">
            <div><span className="panel-path">mmd://models/Product</span><b>{total}</b></div>
            <Button type="primary" size="small" onClick={openCreate}>+ {t("actions.create")}</Button>
          </div>
          <div className="data-toolbar">
            <Input.Search
              allowClear
              placeholder={t("playground.search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onSearch={(value) => loadProducts(value, status)}
            />
            <Select
              allowClear
              placeholder={t("playground.statusFilter")}
              value={status}
              onChange={(value) => {
                setStatus(value);
                void loadProducts(query, value);
              }}
              options={(["draft", "published", "archived"] as ProductStatus[]).map((value) => ({
                label: t(`status.${value}` as MessageKey),
                value,
              }))}
            />
            <Button onClick={() => loadProducts(query, status)}>{t("actions.refresh")}</Button>
          </div>
          <Table<Product>
            columns={columns}
            dataSource={products}
            loading={loading}
            locale={{ emptyText: t("common.noData") }}
            pagination={false}
            rowKey="id"
            scroll={{ x: 1040 }}
            size="small"
          />
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
          <pre className="inspector-code"><code>{inspectorCode[activeTab]}</code></pre>
          <div className="request-history">
            <span className="history-title">{t("playground.activity")}</span>
            <div className="history-list">
              {logs.length ? logs.map((log) => (
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
                  <em>{log.duration === undefined ? "…" : `${log.duration}ms`}</em>
                </button>
              )) : <p>{t("playground.emptyLog")}</p>}
            </div>
          </div>
        </section>
      </div>

      <Modal
        destroyOnHidden
        open={modalOpen}
        title={editing ? t("playground.editProduct") : t("playground.newProduct")}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>{t("actions.cancel")}</Button>,
          <Button key="save" loading={saving} type="primary" onClick={saveProduct}>
            {t("actions.save")}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" className="product-form">
          <div className="form-grid">
            <Form.Item label={t("fields.name")} name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t("fields.sku")} name="sku" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t("fields.price")} name="price" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label={t("fields.inventory")} name="inventory" rules={[{ required: true }]}>
              <InputNumber min={0} precision={0} style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item label={t("fields.cover")} name="cover">
            <Input placeholder="https://…" />
          </Form.Item>
          <div className="form-grid">
            <Form.Item label={t("fields.tags")} name="tags">
              <Select mode="tags" tokenSeparators={[","]} />
            </Form.Item>
            <Form.Item label={t("fields.status")} name="status">
              <Select options={(["draft", "published", "archived"] as ProductStatus[]).map((value) => ({
                label: t(`status.${value}` as MessageKey),
                value,
              }))} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
