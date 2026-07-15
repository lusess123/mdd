"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Card, Descriptions, Skeleton, Space } from "antd";

import { ActionButtons } from "./action-buttons";
import { MmdField } from "./field-renderer";
import { translateMetadataLabel } from "./i18n";
import { resolveContainerFields, resolveFieldOptions } from "./metadata";
import { useMmd } from "./provider";
import type {
  MmdRecord,
  OpenViewInput,
  RendererDataContainer,
  RendererModel,
} from "./types";

export interface DetailContainerProps {
  container: RendererDataContainer;
  model?: RendererModel;
  id?: string;
  openView?: (input: OpenViewInput) => void;
  close?: () => void;
}

export function DetailContainer({
  container,
  model,
  id,
  openView,
  close,
}: DetailContainerProps) {
  const { client, meta, reportError, t } = useMmd();
  const [record, setRecord] = useState<MmdRecord>();
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<Error>();
  const keyField = container.keyField ?? model?.primaryKey ?? "id";
  const fields = useMemo(
    () =>
      resolveContainerFields(container, model).map((field) =>
        resolveFieldOptions(field, meta),
      ),
    [container, meta, model],
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(undefined);
    try {
      const nextRecord = await client.get({
        model: container.name,
        id,
        fields: fields.map((field) => field.name),
      });
      setRecord(nextRecord ?? undefined);
    } catch (cause) {
      setError(reportError(cause));
    } finally {
      setLoading(false);
    }
  }, [client, container.name, fields, id, reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton active />;
  if (error) return <Alert type="error" showIcon title={error.message} />;
  if (!record) return <Alert type="info" showIcon title={t("common.noData")} />;

  return (
    <Card
      title={translateMetadataLabel(t, "models", container.name, container.label)}
      className="mmd-detail-container"
    >
      <Space orientation="vertical" size="middle" style={{ display: "flex" }}>
        {(container.actions ?? []).length > 0 ? (
          <ActionButtons
            actions={container.actions ?? []}
            record={record}
            context={{
              model: container.name,
              keyField,
              client,
              openView,
              close,
              refresh: load,
            }}
            size="middle"
          />
        ) : null}
        <Descriptions
          bordered
          size="small"
          items={fields.map((field) => ({
            key: field.name,
            label: translateMetadataLabel(t, "fields", field.name, field.label),
            span: typeof field.span === "number" ? field.span : 1,
            children: (
              <MmdField
                field={field}
                scene="detail"
                value={record[field.name]}
                record={record}
              />
            ),
          }))}
        />
      </Space>
    </Card>
  );
}
