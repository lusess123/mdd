"use client";
import { useEffect, useState } from "react";
import { Button, Form, Space } from "antd";
import { MmdField } from "./field-renderer";
import {
  filterMetadata,
  isEmptyFilter,
  normalizeFilters,
  validateFilterValue,
} from "./filter-values";
import { translateMetadataLabel } from "./i18n";
import { useMmd } from "./provider";
import type { MmdRecord, RendererField, RendererSearchConfig } from "./types";

export interface FilterFormProps {
  /** 已合并模型、视图与字典的筛选字段。 */
  fields: RendererField[];
  /** 最近应用的查询；不随表单草稿实时变化。 */
  value?: MmdRecord;
  /** 应用/重置时触发；保留 false、0 和字符串小数。 */
  onSearch: (values: MmdRecord) => void;
  /** 默认紧凑四列，容器变窄后两列/一列。 */
  layout?: RendererSearchConfig["layout"];
  /** 独立重置回调，供宿主清理额外默认条件。 */
  onReset?: () => void;
}
const emptyValues: MmdRecord = {};
export function FilterForm({
  fields,
  value = emptyValues,
  onSearch,
  onReset,
  layout = "compact",
}: FilterFormProps) {
  const { locale, t } = useMmd();
  const [form] = Form.useForm<MmdRecord>();
  const record = Form.useWatch([], { form, preserve: true }) ?? value;
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    form.resetFields();
    form.setFieldsValue(value);
  }, [form, value]);
  const available = fields.filter((field) => field.filter !== false);
  const advanced = available.filter(
    (field) => filterMetadata(field).primary === false,
  );
  return (
    <Form<MmdRecord>
      form={form}
      layout={layout === "compact" ? "vertical" : "inline"}
      size="small"
      className={`mmd-search-form${layout === "compact" ? " mmd-filter-form" : ""}`}
      onFinishFailed={() => setExpanded(true)}
      onFinish={(values) => onSearch(normalizeFilters(values))}
    >
      <div
        className={
          layout === "compact" ? "mmd-filter-grid" : "mmd-filter-inline"
        }
      >
        {available.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            hidden={
              layout === "compact" &&
              !expanded &&
              filterMetadata(field).primary === false &&
              isEmptyFilter(value[field.name])
            }
            label={translateMetadataLabel(t, "fields", field.name, field.label)}
            rules={[
              {
                validator: (_rule, next: unknown) => {
                  const error = validateFilterValue({
                    field,
                    value: next,
                    locale,
                  });
                  return error
                    ? Promise.reject(new Error(error))
                    : Promise.resolve();
                },
              },
            ]}
          >
            <MmdField
              field={field}
              scene="search"
              value={undefined}
              record={record}
            />
          </Form.Item>
        ))}
      </div>
      <Space className="mmd-search-actions" wrap>
        <Button type="primary" htmlType="submit">
          {t("common.search")}
        </Button>
        <Button
          onClick={() => {
            form.resetFields();
            onReset ? onReset() : onSearch({});
          }}
        >
          {t("common.reset")}
        </Button>
        {layout === "compact" && advanced.length > 0 ? (
          <Button
            type="link"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {locale === "en-US"
              ? expanded
                ? "Fewer filters"
                : `More filters (${advanced.length})`
              : expanded
                ? "收起筛选"
                : `更多筛选（${advanced.length}）`}
          </Button>
        ) : null}
        <span aria-live="polite" className="mmd-filter-summary">
          {locale === "en-US"
            ? Object.keys(normalizeFilters(value)).length
              ? `${Object.keys(normalizeFilters(value)).length} active filters`
              : `${available.length} available filter fields`
            : Object.keys(normalizeFilters(value)).length
              ? `已应用 ${Object.keys(normalizeFilters(value)).length} 项筛选`
              : `可按 ${available.length} 个字段筛选`}
        </span>
      </Space>
    </Form>
  );
}
