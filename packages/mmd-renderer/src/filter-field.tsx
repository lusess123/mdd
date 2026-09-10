import { useId } from "react";
import { Input, InputNumber, Select, Typography } from "antd";
import type { MmdRecord, RendererField } from "./types";
import { useMmd } from "./provider";
import * as ReferenceFieldComponent from "./reference-field";
import * as ResourceFilterDomain from "./filter-values";

export function FilterField({
  field,
  value,
  onChange = () => {},
  record = {},
}: {
  field: RendererField;
  value?: unknown;
  onChange?: (value: unknown) => void;
  record?: MmdRecord;
}) {
  const { locale } = useMmd();
  const t = (text: { zh: string; en: string }) => locale === "en-US" ? text.en : text.zh;
  const hintId = useId();
  const metadata = ResourceFilterDomain.filterMetadata(field);
  const kind = metadata.kind;
  const label = field.label ?? field.name;
  const error = ResourceFilterDomain.validateFilterValue({
    field,
    value,
    locale,
  });
  const textValue =
    typeof value === "string" || typeof value === "number" ? String(value) : "";
  if (kind === "reference") {
    const context = ReferenceFieldComponent.referenceContext({ field, record });
    if (context.canSelect)
      return (
        <ReferenceFieldComponent.ReferenceField
          field={{ ...field, readOnly: false, required: false }}
          record={context.record}
          value={value}
          scene="search"
          onChange={(next) =>
            onChange(
              ResourceFilterDomain.isEmptyFilter(next) ? undefined : next,
            )
          }
        />
      );
    return (
      <div>
        <Input
          aria-label={label}
          aria-describedby={hintId}
          allowClear
          value={textValue}
          placeholder={t({
            zh: "完整记录编号，精确匹配",
            en: "Full record ID, exact match",
          })}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
        <Typography.Text id={hintId} type="secondary" style={{ fontSize: 12 }}>
          {t({
            zh: "选择单一关联类型后可搜索记录；也可直接输入完整编号。",
            en: "Select one related type to search records, or enter the full ID.",
          })}
        </Typography.Text>
      </div>
    );
  }
  if (kind === "enum") {
    if (metadata.allowCustom)
      return (
        <div>
          <Select
            mode="tags"
            allowClear
            showSearch
            filterOption={(query, option) =>
              [option?.label, option?.value].some(
                (value) =>
                  typeof value === "string" &&
                  value.toLowerCase().includes(query.toLowerCase()),
              )
            }
            aria-label={label}
            aria-describedby={hintId}
            aria-invalid={!!error}
            status={error ? "error" : ""}
            style={{ width: "100%" }}
            placeholder={t({
              zh: "选择或输入值，按回车添加",
              en: "Select or type a value, then press Enter",
            })}
            value={ResourceFilterDomain.customEnumValues(value)}
            options={(field.options ?? []).flatMap((option) =>
              typeof option.value === "string"
                ? [{ ...option, value: option.value }]
                : [],
            )}
            onChange={(values: string[]) =>
              onChange(values.length ? values : undefined)
            }
          />
          <Typography.Text
            className="mmd-filter-hint"
            id={hintId}
            type="secondary"
            style={{ fontSize: 12 }}
          >
            {t({
              zh: "可输入未列出的完整值；多个值按精确匹配查询。",
              en: "Unlisted full values are accepted; multiple values match exactly.",
            })}
          </Typography.Text>
        </div>
      );
    const options = ResourceFilterDomain.enumOptions({
      options: field.options,
      value,
    });
    return (
      <Select
        mode="multiple"
        allowClear
        showSearch
        filterOption={(query, option) =>
          [option?.label, option?.rawValue].some(
            (value) =>
              value !== undefined &&
              String(value).toLowerCase().includes(query.toLowerCase()),
          )
        }
        aria-label={label}
        style={{ width: "100%" }}
        placeholder={t({
          zh: "全部，可多选",
          en: "All values; select one or more",
        })}
        value={ResourceFilterDomain.enumKeys({ options, value })}
        options={options.map((option, index) => ({
          label: option.label,
          value: String(index),
          rawValue: option.value,
        }))}
        onChange={(keys: string[]) =>
          onChange(ResourceFilterDomain.enumValues({ options, keys }))
        }
      />
    );
  }
  if (kind === "boolean")
    return (
      <Select
        aria-label={label}
        style={{ width: "100%" }}
        value={value === true ? "true" : value === false ? "false" : "all"}
        options={[
          { value: "all", label: t({ zh: "全部", en: "All" }) },
          { value: "true", label: t({ zh: "是", en: "Yes" }) },
          { value: "false", label: t({ zh: "否", en: "No" }) },
        ]}
        onChange={(next: string) =>
          onChange(next === "all" ? undefined : next === "true")
        }
      />
    );
  if (kind === "number" || kind === "datetime") {
    const { lower, upper } = ResourceFilterDomain.rangeBounds(value);
    const timeZone = Intl.DateTimeFormat(locale).resolvedOptions().timeZone;
    return (
      <div>
        <div
          className="mmd-filter-range"
          style={{
            display: "grid",
            gridTemplateColumns:
              kind === "datetime"
                ? "minmax(0, 1fr)"
                : "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 4,
          }}
        >
          {(
            ["lower", "upper"] satisfies Array<
              Parameters<typeof ResourceFilterDomain.updateRange>[0]["edge"]
            >
          ).map((edge) => {
            const bound = edge === "lower" ? lower : upper;
            const placeholder =
              kind === "number"
                ? edge === "lower"
                  ? t({ zh: "最小值（含）", en: "Minimum (inclusive)" })
                  : t({ zh: "最大值（含）", en: "Maximum (inclusive)" })
                : edge === "lower"
                  ? t({ zh: "起始时间（含）", en: "From (inclusive)" })
                  : t({ zh: "结束时间（含）", en: "To (inclusive)" });
            const updateDateTime = (next: string) =>
              onChange(
                ResourceFilterDomain.updateRange({
                  value,
                  edge,
                  next: ResourceFilterDomain.localDateTimeToIso(next),
                }),
              );
            return kind === "number" ? (
              <InputNumber
                key={edge}
                stringMode={metadata.decimal}
                value={
                  typeof bound === "number" || typeof bound === "string"
                    ? bound
                    : null
                }
                style={{ width: "100%" }}
                aria-label={`${label} · ${placeholder}`}
                aria-describedby={hintId}
                aria-invalid={!!error}
                placeholder={placeholder}
                status={error ? "error" : ""}
                onChange={(next) =>
                  onChange(
                    ResourceFilterDomain.updateRange({ value, edge, next }),
                  )
                }
              />
            ) : (
              <Input
                key={edge}
                type="datetime-local"
                lang={locale}
                step="0.001"
                value={ResourceFilterDomain.localDateTimeValue(bound)}
                aria-label={`${label} · ${placeholder}`}
                aria-describedby={hintId}
                aria-invalid={!!error}
                placeholder={placeholder}
                status={error ? "error" : ""}
                // 原生 input 可覆盖程序填入时 React change 追踪未识别的值变化。
                onInput={(event) => updateDateTime(event.currentTarget.value)}
                onChange={(event) => {
                  // input 已实时同步；change 保留给仅派发 change 的日期选择操作。
                  if (event.nativeEvent.type !== "input")
                    updateDateTime(event.target.value);
                }}
              />
            );
          })}
        </div>
        <Typography.Text
          className="mmd-filter-hint"
          id={hintId}
          type="secondary"
          style={{ fontSize: 12 }}
        >
          {kind === "datetime"
            ? t({
                zh: `本地时区：${timeZone}；可留空任一端。`,
                en: `Local time zone: ${timeZone}; either end may be left blank.`,
              })
            : t({
                zh: "可只填写最小值或最大值。",
                en: "Either end may be left blank.",
              })}
        </Typography.Text>
      </div>
    );
  }
  return (
    <Input
      aria-label={label}
      allowClear
      value={textValue}
      placeholder={
        kind === "id"
          ? t({ zh: "完整编号，精确匹配", en: "Full ID, exact match" })
          : t({ zh: "包含此文字", en: "Contains this text" })
      }
      onChange={(event) => onChange(event.target.value || undefined)}
    />
  );
}
