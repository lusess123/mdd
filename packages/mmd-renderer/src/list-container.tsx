"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Space,
  Table,
  type TableColumnsType,
  type TablePaginationConfig,
} from "antd";

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
        field.pageStyle.some((style) => ["List", "All", "ReadOnly"].includes(style))),
  );
}

export function ListContainer({
  container,
  model,
  where,
  openView,
  onRowChange,
}: ListContainerProps) {
  const { client, meta, reportError, t } = useMmd();
  const [data, setData] = useState<MmdListResult>({
    rows: [],
    total: 0,
    page: 1,
    pageSize: container.pageSize ?? 20,
  });
  const { rows } = data;
  const requestVersion = useRef(0);
  const [paginationRequest, setPaginationRequest] = useState({
    page: 1,
    pageSize: container.pageSize ?? 20,
  });
  const [search, setSearch] = useState<MmdRecord>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const keyField = container.keyField ?? model?.primaryKey ?? "id";
  const fields = useMemo(() => {
    const configured =
      container.fields.length > 0
        ? resolveContainerFields(container, model)
        : defaultListFields(model);
    return configured.map((field) => resolveFieldOptions(field, meta));
  }, [container, meta, model]);
  const searchFields = useMemo(() => {
    if (!container.search) return [];
    return resolveContainerFields(
      { ...container, fields: container.search.fields },
      model,
    ).map((field) => resolveFieldOptions(field, meta));
  }, [container, meta, model]);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await client.list({
        model: container.name,
        fields: fields.map((field) => field.name),
        page: paginationRequest.page,
        pageSize: paginationRequest.pageSize,
        where,
        search,
      });
      if (version === requestVersion.current) setData(result);
    } catch (cause) {
      if (version === requestVersion.current) setError(reportError(cause));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [client, container.name, fields, paginationRequest, reportError, search, where]);

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
        fixed: "right",
        render: (_value: unknown, record: MmdRecord) => (
          <ActionButtons actions={rowActions} context={actionContext} record={record} />
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
    setPaginationRequest(nextListPage(pagination, data.pageSize));
  };

  return (
    <Card
      title={translateMetadataLabel(t, "models", container.name, container.label)}
      className="mmd-list-container"
    >
      <Space
        className="mmd-list-content"
        orientation="vertical"
        size="middle"
        style={{ display: "flex" }}
      >
        {searchFields.length > 0 ? (
          <Form
            className="mmd-search-form"
            layout="inline"
            onFinish={(values) => {
              setPaginationRequest((previous) => ({ ...previous, page: 1 }));
              setSearch(values as MmdRecord);
            }}
          >
            {searchFields.map((field) => (
              <Form.Item
                key={field.name}
                name={field.name}
                label={translateMetadataLabel(t, "fields", field.name, field.label)}
              >
                <MmdField field={field} scene="search" value={undefined} />
              </Form.Item>
            ))}
            <Form.Item>
              <Space className="mmd-search-actions">
                <Button htmlType="submit" type="primary">
                  {t("common.search")}
                </Button>
                <Button
                  htmlType="reset"
                  onClick={() => {
                    setPaginationRequest((previous) => ({ ...previous, page: 1 }));
                    setSearch({});
                  }}
                >
                  {t("common.reset")}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : null}
        {pageActions.length > 0 ? (
          <div className="mmd-page-actions">
            <ActionButtons actions={pageActions} context={actionContext} size="middle" />
          </div>
        ) : null}
        {error ? <Alert type="error" showIcon title={error.message} /> : null}
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
    </Card>
  );
}
