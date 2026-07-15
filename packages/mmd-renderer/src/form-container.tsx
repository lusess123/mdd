"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Card, Form, Skeleton, Space } from "antd";

import { ActionButtons } from "./action-buttons";
import { MmdField } from "./field-renderer";
import { translateMetadataLabel } from "./i18n";
import { resolveContainerFields, resolveFieldOptions } from "./metadata";
import { useMmd } from "./provider";
import type {
  MmdRecord,
  OpenViewInput,
  RendererAction,
  RendererDataContainer,
  RendererModel,
} from "./types";

export interface FormContainerProps {
  container: RendererDataContainer;
  model?: RendererModel;
  id?: string;
  openView?: (input: OpenViewInput) => void;
  close?: () => void;
  refresh?: () => void | Promise<void>;
  onSaved?: (record: MmdRecord) => void;
}

const defaultActions: RendererAction[] = [
  { label: "Save", type: "submit", tone: "primary" },
];

export function FormContainer({
  container,
  model,
  id,
  openView,
  close,
  refresh,
  onSaved,
}: FormContainerProps) {
  const { client, meta, reportError, t } = useMmd();
  const [form] = Form.useForm<MmdRecord>();
  const [draft, setDraft] = useState<MmdRecord>({});
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

  useEffect(() => {
    const defaults = Object.fromEntries(
      fields
        .filter((field) => field.defaultValue !== undefined)
        .map((field) => [field.name, field.defaultValue]),
    );
    setDraft(defaults);
    form.setFieldsValue(defaults);
  }, [fields, form]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    void client
      .get({
        model: container.name,
        id,
        fields: fields.map((field) => field.name),
      })
      .then((record) => {
        if (cancelled || !record) return;
        setDraft(record);
        form.setFieldsValue(record);
      })
      .catch((cause) => {
        if (!cancelled) setError(reportError(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, container.name, fields, form, id, reportError]);

  const submit = useCallback(async () => {
    const values = await form.validateFields();
    const saved = await client.save({
      model: container.name,
      id,
      row: values,
      fields: fields.map((field) => field.name),
    });
    setDraft(saved);
    form.setFieldsValue(saved);
    onSaved?.(saved);
    return saved;
  }, [client, container.name, fields, form, id, onSaved]);

  if (loading) {
    return (
      <>
        <Form form={form} style={{ display: "none" }} />
        <Skeleton active />
      </>
    );
  }

  return (
    <Card
      title={translateMetadataLabel(t, "models", container.name, container.label)}
      className="mmd-form-container"
    >
      <Space orientation="vertical" size="middle" style={{ display: "flex" }}>
        {error ? <Alert type="error" showIcon title={error.message} /> : null}
        <Form<MmdRecord>
          form={form}
          layout="vertical"
          onValuesChange={(_change, values) => setDraft(values)}
        >
          {fields.map((field) => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={translateMetadataLabel(t, "fields", field.name, field.label)}
              rules={
                field.required
                  ? [
                      {
                        required: true,
                        message: t("validation.required", {
                            field: translateMetadataLabel(
                              t,
                              "fields",
                              field.name,
                              field.label,
                            ),
                        }),
                      },
                    ]
                  : undefined
              }
            >
              <MmdField
                field={field}
                scene="form"
                value={undefined}
                disabled={field.readOnly}
              />
            </Form.Item>
          ))}
        </Form>
        <ActionButtons
          actions={container.actions?.length ? container.actions : defaultActions}
          record={draft}
          context={{
            model: container.name,
            keyField,
            client,
            record: draft,
            openView,
            submit,
            close,
            refresh,
          }}
          size="middle"
        />
      </Space>
    </Card>
  );
}
