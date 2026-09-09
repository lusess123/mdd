import { useEffect, useState } from "react";
import { Button, Empty, Pagination, Select, Space, Spin, Tooltip, Input } from "antd";

import type { FieldRendererProps, RendererField, MmdRecord } from "./types";
import { useMmd } from "./provider";
import { useReferenceData } from "./reference-provider";

/** 单元素筛选数组仅用于解析目标，不修改原始筛选值。歧义时退回 ID 输入。 */
export function referenceContext({ field, record = {} }: { field: RendererField; record?: MmdRecord }) {
  const resolvedRecord = { ...record };
  for (const reference of field.references ?? []) {
    if (!reference.when) continue;
    const value = resolvedRecord[reference.when.field];
    if (Array.isArray(value) && value.length === 1) resolvedRecord[reference.when.field] = value[0];
  }
  const conditional = (field.references ?? []).filter((reference) => reference.when &&
    Object.is(resolvedRecord[reference.when.field], reference.when.value));
  const candidates = conditional.length ? conditional : (field.references ?? []).filter((reference) => !reference.when);
  const targets = [...new Set(candidates.map((reference) => reference.target))];
  const model = field.references?.length ? (targets.length === 1 ? targets[0] ?? "" : "")
    : typeof field.relationModel === "string" ? field.relationModel : "";
  return {
    /** 当前可唯一确定的模型；空字符串表示目标不确定。 */
    model,
    /** 只供选择器解析条件，不写回记录。 */
    record: resolvedRecord,
    /** 未确定目标时允许精确 ID 输入。 */
    canSelect: Boolean(model),
  };
}

export function ReferenceField({
  field,
  value,
  record,
  scene,
  disabled,
  onChange,
}: FieldRendererProps) {
  const context = useReferenceData();
  const data = context?.data;
  const { locale } = useMmd();
  const t = (text: { zh: string; en: string }) => locale === "en-US" ? text.en : text.zh;
  const { model } = referenceContext({ field, record });
  const id = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const [label, setLabel] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [labelError, setLabelError] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const editable =
    (scene === "form" || scene === "search") && !field.readOnly && !disabled;
  useEffect(() => {
    let live = true;
    setLabel(null);
    setMissing(false);
    setLabelError(false);
    if (data && model && id)
      void data
        .resolve({ model, id })
        .then((value) => {
          if (live) {
            setLabel(value);
            setMissing(value === null);
          }
        })
        .catch(() => {
          if (live) setLabelError(true);
        });
    return () => {
      live = false;
    };
  }, [data, model, id, retry]);
  useEffect(() => {
    if (!open || !editable || !data || !model) return;
    let live = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(
      () => {
        void data
          .search({ model, term: search, page })
          .then((result) => {
            if (live) {
              setOptions(result.options);
              setTotal(result.total);
            }
          })
          .catch((error: unknown) => {
            if (live)
              setError(
                error instanceof Error
                  ? error.message
                  : t({
                      zh: "关联记录加载失败",
                      en: "Failed to load related records",
                    }),
              );
          })
          .finally(() => {
            if (live) setLoading(false);
          });
      },
      search ? 250 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [data, model, editable, open, search, page, retry, locale]);
  useEffect(() => { setOptions([]); setTotal(0); setPage(1); setSearch(""); }, [model]);
  if (!editable) {
    if (!id) return <span className="empty-value">—</span>;
    if (!model) return <span className="numeric">{id}</span>;
    if (missing)
      return (
        <Tooltip title={id}>
          <span className="mmd-reference-missing">
            {t({ zh: "关联记录不可见", en: "Related record unavailable" })} ·{" "}
            {id.slice(-8)}
          </span>
        </Tooltip>
      );
    return (
      <Tooltip
        title={
          labelError
            ? t({
                zh: `名称加载失败，可重试或打开记录 · ${id}`,
                en: `The name could not be loaded. Retry or open the record · ${id}`,
              })
            : id
        }
      >
        <a
          className="mmd-reference-link"
          href={context?.href?.({ model, id })}
          onClick={(event) => {
            if (
              context?.navigate && context.href &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              event.button === 0
            ) {
              event.preventDefault();
              context.navigate(
                event.currentTarget.getAttribute("href") ?? "/",
              );
            }
          }}
        >
          {label ?? `${t({ zh: "记录", en: "Record" })} · ${id.slice(-8)}`}{" "}
          <span aria-hidden="true">↗</span>
        </a>
      </Tooltip>
    );
  }
  if (!model || !data) return <Input aria-label={field.label ?? field.name} value={id}
    allowClear={!field.required} onChange={(event) => onChange?.(event.target.value || null)} />;
  const selectedOption =
    id && !options.some((option) => option.value === id)
      ? [
          {
            value: id,
            label:
              label ?? `${t({ zh: "记录", en: "Record" })} · ${id.slice(-8)}`,
          },
        ]
      : [];
  return (
    <Select
      aria-label={field.label ?? field.name}
      style={{ width: "100%", minWidth: 0 }}
      showSearch
      allowClear={!field.required}
      filterOption={false}
      placeholder={t({
        zh: "搜索关联名称或粘贴完整编号",
        en: "Search by name or paste a full record ID",
      })}
      value={id || undefined}
      open={open}
      loading={loading}
      options={open && search ? options : [...selectedOption, ...options]}
      labelRender={(option) =>
        option.value === id ? (label ?? option.label) : option.label
      }
      optionRender={(option) => (
        <div className="mmd-reference-option">
          <span>{option.label}</span>
          <small>{String(option.value).slice(-8)}</small>
        </div>
      )}
      onOpenChange={setOpen}
      onSearch={(value) => {
        setSearch(value);
        setPage(1);
      }}
      onChange={(value: string | undefined) => {
        onChange?.(value ?? null);
        setSearch("");
        setPage(1);
      }}
      notFoundContent={
        loading ? (
          <Spin size="small" />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              error ||
              t({
                zh: "未找到记录；可尝试完整编号",
                en: "No records found. Try a full record ID.",
              })
            }
          />
        )
      }
      popupRender={(menu) => (
        <>
          {menu}
          <div
            className="mmd-reference-pagination"
            onMouseDown={(event) => event.preventDefault()}
          >
            {error ? (
              <Button
                size="small"
                onClick={() => setRetry((value) => value + 1)}
              >
                {t({ zh: "重试", en: "Retry" })}
              </Button>
            ) : (
              <Space>
                <span>
                  {t({
                    zh: `共 ${new Intl.NumberFormat(locale).format(total)} 条`,
                    en: `${new Intl.NumberFormat(locale).format(total)} ${total === 1 ? "record" : "records"}`,
                  })}
                </span>
                <Pagination
                  simple
                  size="small"
                  current={page}
                  pageSize={data.pageSize}
                  total={total}
                  showSizeChanger={false}
                  onChange={setPage}
                />
              </Space>
            )}
          </div>
        </>
      )}
    />
  );
}
