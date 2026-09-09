"use client";

import {
  useCallback,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Card, Form, Skeleton, Space } from "antd";

import { createRecordFieldsSelector } from "./record-fields";
import { isJsonField, validateJson } from "./json-value";
import {
  isReadOnlyField,
  writableFormValues,
  initialFormValues,
} from "./form-values";
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
  defaults?: MmdRecord;
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
  defaults,
  openView,
  close,
  refresh,
  onSaved,
}: FormContainerProps) {
  const { client, meta, reportError, t, locale, changeGuard } = useMmd();
  const formId = useId();
  useEffect(
    () => () => changeGuard.setDirty({ id: formId, value: false }),
    [changeGuard, formId],
  );
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

  const selectRecordFields = useMemo(createRecordFieldsSelector, []);
  const recordFields = selectRecordFields(fields);
  const currentFields = useRef(fields);
  useEffect(() => {
    currentFields.current = fields;
  }, [fields]);

  const defaultsKey = JSON.stringify(id ? {} : (defaults ?? {}));
  useEffect(() => {
    const defaults = initialFormValues({
      fields: currentFields.current,
      keyField,
      defaults: JSON.parse(defaultsKey),
    });
    changeGuard.setDirty({ id: formId, value: false });
    form.resetFields();
    setError(undefined);
    setDraft(defaults);
    form.setFieldsValue(defaults);
  }, [
    container.name,
    id,
    recordFields,
    form,
    locale,
    changeGuard,
    formId,
    defaultsKey,
    keyField,
  ]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    void client
      .get({
        model: container.name,
        id,
        fields: recordFields,
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
  }, [client, container.name, recordFields, form, id, reportError, locale]);

  const submit = useCallback(async () => {
    const values = await form.validateFields().catch(() => {
      throw new Error(t("validation.form"));
    });
    const saved = await client.save({
      model: container.name,
      id,
      row: writableFormValues({ values, fields, keyField }),
      fields: recordFields,
    });
    changeGuard.setDirty({ id: formId, value: false });
    setDraft(saved);
    form.setFieldsValue(saved);
    onSaved?.(saved);
    return saved;
  }, [
    client,
    container.name,
    fields,
    recordFields,
    form,
    id,
    keyField,
    onSaved,
    t,
    changeGuard,
    formId,
  ]);

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
      title={translateMetadataLabel(
        t,
        "models",
        container.name,
        container.label,
      )}
      className="mmd-form-container"
    >
      <Space
        className="mmd-form-content"
        orientation="vertical"
        size="middle"
        style={{ display: "flex" }}
      >
        {error ? <Alert type="error" showIcon title={error.message} /> : null}
        <Form<MmdRecord>
          className="mmd-edit-form"
          form={form}
          layout="vertical"
          onValuesChange={(_change, values) => {
            changeGuard.setDirty({ id: formId, value: true });
            setDraft(values);
          }}
        >
          {fields.map((field) => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={translateMetadataLabel(
                t,
                "fields",
                field.name,
                field.label,
              )}
              rules={[
                ...(field.required && !isReadOnlyField(field, keyField)
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
                  : []),
                ...(isJsonField(field) && !isReadOnlyField(field, keyField)
                  ? [
                      {
                        validator: (_rule: unknown, value: unknown) =>
                          validateJson(value)
                            ? Promise.resolve()
                            : Promise.reject(new Error(t("validation.json"))),
                      },
                    ]
                  : []),
              ]}
            >
              <MmdField
                field={field}
                scene="form"
                record={draft}
                value={undefined}
                disabled={isReadOnlyField(field, keyField)}
              />
            </Form.Item>
          ))}
        </Form>
        <div className="mmd-form-actions">
          <ActionButtons
            actions={
              container.actions?.length ? container.actions : defaultActions
            }
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
        </div>
      </Space>
    </Card>
  );
}
