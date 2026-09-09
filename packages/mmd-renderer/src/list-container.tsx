"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Select,
  Grid,
  Card,
  Space,
  Table,
  type TableColumnsType,
  type TablePaginationConfig,
} from "antd";

import type { ReactNode } from "react";
import {
  normalizeListSearch,
  type ListQuery,
  type QueryState,
} from "./navigation/query-state";
import { FilterForm } from "./filter-form";
import { createRecordFieldsSelector } from "./record-fields";
import { ActionButtons } from "./action-buttons";
import { MmdField } from "./field-renderer";
import { translateMetadataLabel } from "./i18n";
import { listTableSnapshot, nextListPage } from "./list-pagination";
import { resolveContainerFields, resolveFieldOptions } from "./metadata";
import { useMmd } from "./provider";
import { createRowNumberColumn } from "./row-number";
import type {
  MmdRecord,
  MmdListResult,
  OpenViewInput,
  RendererAction,
  RendererDataContainer,
  RendererField,
  RendererModel,
} from "./types";

export interface ListContainerProps {
  container: RendererDataContainer;
  /** 宿主提供可选持久化适配器；不绑定浏览器或特定路由器。 */
  queryState?: QueryState<ListQuery>;
  /** 默认查询与排序，未配置时沿用旧分页行为。 */
  initialQuery?: Partial<ListQuery>;
  /** 页面布局已提供面板时可使用 plain。 */
  appearance?: "card" | "plain";
  /** 将主键放在业务字段前。 */
  keyFirst?: boolean;
  /** 新建操作上下文，固定关系字段优先于默认值。 */
  defaults?: MmdRecord;
  /** 排序选项由宿主/元数据提供，不假设 createdAt 等字段存在。 */
  sortOptions?: Array<{
    label: string;
    value: string;
    sort: ListQuery["sort"];
  }>;
  /** 仅作用于本次请求的业务默认筛选，不写入查询状态。 */
  mapSearch?: (search: MmdRecord) => MmdRecord;
  /** 应用或重置时通知宿主清理外部默认条件。 */
  onFilterChange?: (input: { search: MmdRecord; reset: boolean }) => void;
  /** 筛选后插槽可展示宿主提示，支持主动刷新。 */
  afterFilters?: (input: {
    query: ListQuery;
    refresh: () => Promise<void>;
  }) => ReactNode;

  model?: RendererModel;
  where?: MmdRecord;
  openView?: (input: OpenViewInput) => void;
  onRowChange?: (row: MmdRecord) => void;
}

function uniqueActions(actions: RendererAction[]): RendererAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.placement ?? ""}:${action.extend ?? action.name ?? action.type ?? action.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function defaultListFields(model?: RendererModel): RendererField[] {
  return (model?.fields ?? []).filter(
    (field) =>
      field.list !== false &&
      (String(field.fieldType ?? field.type).toLowerCase() !== "key" ||
        field.list === true) &&
      (!Array.isArray(field.pageStyle) ||
        field.pageStyle.length === 0 ||
        field.pageStyle.some((style) =>
          ["List", "All", "ReadOnly"].includes(style),
        )),
  );
}

export function ListContainer({
  container,
  model,
  where,
  openView,
  onRowChange,
  queryState,
  initialQuery,
  appearance = "card",
  keyFirst = false,
  defaults,
  sortOptions,
  mapSearch,
  onFilterChange,
  afterFilters,
}: ListContainerProps) {
  const { client, meta, reportError, t, locale } = useMmd();
  const screens = Grid.useBreakpoint();
  const [query, setQuery] = useState<ListQuery>(
    () =>
      queryState?.read() ?? {
        search: {},
        sort: [],
        page: 1,
        pageSize: container.pageSize ?? 20,
        ...initialQuery,
      },
  );
  const search = query.search;
  function updateQuery(next: ListQuery) {
    setQuery(next);
    queryState?.write(next);
    setSelectedIds([]);
  }
  useEffect(
    () =>
      queryState?.subscribe?.(() => {
        setQuery(queryState.read());
        setSelectedIds([]);
      }),
    [queryState],
  );
  const [data, setData] = useState<MmdListResult>({
    rows: [],
    total: 0,
    page: query.page,
    pageSize: query.pageSize,
  });
  const { rows } = data;
  const requestVersion = useRef(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const keyField = container.keyField ?? model?.primaryKey ?? "id";
  const fields = useMemo(() => {
    const configured =
      container.fields.length > 0
        ? resolveContainerFields(container, model)
        : defaultListFields(model);
    const ordered = keyFirst
      ? [
          ...configured.filter((field) => field.name === keyField),
          ...configured.filter((field) => field.name !== keyField),
        ]
      : configured;
    return ordered.map((field) => resolveFieldOptions(field, meta));
  }, [container, meta, model, keyFirst, keyField]);
  const searchFields = useMemo(() => {
    if (!container.search) return [];
    return resolveContainerFields(
      { ...container, fields: container.search.fields },
      model,
    )
      .filter(
        (field) =>
          field.filter !== false && !Object.hasOwn(where ?? {}, field.name),
      )
      .map((field) => resolveFieldOptions(field, meta));
  }, [container, meta, model, where]);

  const selectRecordFields = useMemo(createRecordFieldsSelector, []);
  const recordFields = selectRecordFields(fields.some(field => field.name === keyField) ? fields : [{ name: keyField }, ...fields]);

  const searchFieldKey = JSON.stringify(
    searchFields.map((field) => field.name),
  );
  const currentSearch = useRef({ fields: searchFields, mapSearch });
  currentSearch.current = { fields: searchFields, mapSearch };

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(undefined);
    try {
      const filtered = normalizeListSearch({
        values: query.search,
        fields: currentSearch.current.fields.map((field) => field.name),
      });
      const result = await client.list({
        model: container.name,
        fields: recordFields,
        page: query.page,
        pageSize: query.pageSize,
        where,
        search: currentSearch.current.mapSearch?.(filtered) ?? filtered,
        ...(query.sort.length ? { sort: query.sort } : {}),
      });
      if (version === requestVersion.current) setData(result);
    } catch (cause) {
      if (version === requestVersion.current) setError(reportError(cause));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [
    client,
    container.name,
    recordFields,
    query,
    reportError,
    where,
    mapSearch,
    searchFieldKey,
  ]);

  useEffect(() => {
    void load();
    return () => {
      requestVersion.current += 1;
    };
  }, [load]);

  const pageActions = uniqueActions([
    ...(container.actions ?? []),
    ...(model?.actions ?? []).filter((action) => action.placement !== "row"),
  ]);
  const rowActions = uniqueActions([
    ...(container.dataActions ?? []),
    ...(model?.dataActions ?? []),
    ...(model?.actions ?? []).filter((action) => action.placement === "row"),
  ]);
  const selectedRecords = useMemo(() => {
    const ids = new Set(selectedIds);
    return rows.filter((row) => ids.has(String(row[keyField])));
  }, [keyField, rows, selectedIds]);
  const actionContext = {
    model: container.name,
    keyField,
    client,
    selectedIds,
    selectedRecords,
    openView,
    record: { ...defaults, ...where },
    refresh: load,
  };

  const columns = useMemo<TableColumnsType<MmdRecord>>(() => {
    const fieldColumns: TableColumnsType<MmdRecord> = fields.map((field) => ({
      key: field.name,
      title: translateMetadataLabel(t, "fields", field.name, field.label),
      dataIndex: field.name,
      render: (value: unknown, record: MmdRecord) => (
        <MmdField field={field} scene="list" value={value} record={record} />
      ),
    }));
    const displayColumns: TableColumnsType<MmdRecord> = container.showRowNumber
      ? [
          createRowNumberColumn({
            page: data.page,
            pageSize: data.pageSize,
            title: t("common.rowNumber"),
          }),
          ...fieldColumns,
        ]
      : fieldColumns;
    if (rowActions.length === 0) return displayColumns;
    return [
      ...displayColumns,
      {
        key: "__actions",
        title: t("common.actions"),
        fixed: screens.md ? "right" : undefined,
        render: (_value: unknown, record: MmdRecord) => (
          <ActionButtons
            actions={rowActions}
            context={actionContext}
            record={record}
          />
        ),
      },
    ];
  }, [
    actionContext,
    container.showRowNumber,
    data.page,
    data.pageSize,
    fields,
    rowActions,
    t,
  ]);

  const handleTableChange = (pagination: TablePaginationConfig) => {
    updateQuery({ ...query, ...nextListPage(pagination, data.pageSize) });
  };

  const content = (
    <Space
      className="mmd-list-content"
      orientation="vertical"
      size="middle"
      style={{ display: "flex" }}
    >
      {searchFields.length > 0 ? (
        <FilterForm
          fields={searchFields}
          value={search}
          layout={container.search?.layout ?? "inline"}
          onReset={() => {
            onFilterChange?.({ search: {}, reset: true });
            updateQuery({ ...query, page: 1, search: {} });
          }}
          onSearch={(values) => {
            const search = normalizeListSearch({
              values,
              fields: searchFields.map((field) => field.name),
            });
            onFilterChange?.({ search, reset: false });
            updateQuery({ ...query, page: 1, search });
          }}
        />
      ) : null}
      {afterFilters?.({ query, refresh: load })}
      <div className="mmd-list-toolbar">
        <Space wrap>
          <span>
            {locale === "en-US"
              ? `${new Intl.NumberFormat(locale).format(data.total)} ${data.total === 1 ? "record" : "records"}`
              : `共 ${new Intl.NumberFormat(locale).format(data.total)} 条记录`}
          </span>
          {sortOptions?.length ? (
            <Select
              size="small"
              aria-label={locale === "en-US" ? "Sort order" : "排序方式"}
              value={
                sortOptions.find(
                  (option) =>
                    JSON.stringify(option.sort) === JSON.stringify(query.sort),
                )?.value
              }
              options={sortOptions.map(({ label, value }) => ({
                label,
                value,
              }))}
              onChange={(value) => {
                const option = sortOptions.find(
                  (option) => option.value === value,
                );
                if (option)
                  updateQuery({ ...query, page: 1, sort: option.sort });
              }}
            />
          ) : null}
        </Space>
        <ActionButtons
          actions={pageActions}
          context={actionContext}
          size="middle"
        />
      </div>
      {error ? (
        <Alert
          type="error"
          showIcon
          title={error.message}
          action={
            <Button onClick={() => void load()}>
              {locale === "en-US" ? "Retry" : "重试"}
            </Button>
          }
        />
      ) : null}
      <div className="mmd-table-region">
        <Table<MmdRecord>
          {...listTableSnapshot(data)}
          rowKey={(row) => String(row[keyField])}
          columns={columns}
          loading={loading}
          locale={{ emptyText: t("common.noData") }}
          scroll={{ x: "max-content" }}
          rowSelection={
            pageActions.some((action) => action.placement === "bulk")
              ? {
                  selectedRowKeys: selectedIds,
                  onChange: (keys) => setSelectedIds(keys.map(String)),
                }
              : undefined
          }
          onChange={handleTableChange}
          onRow={(record) => ({ onClick: () => onRowChange?.(record) })}
        />
      </div>
    </Space>
  );
  return appearance === "plain" ? (
    <div className="mmd-list-container mmd-list-plain">{content}</div>
  ) : (
    <Card
      title={translateMetadataLabel(
        t,
        "models",
        container.name,
        container.label,
      )}
      className="mmd-list-container"
    >
      {content}
    </Card>
  );
}
