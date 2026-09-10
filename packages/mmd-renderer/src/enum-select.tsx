import { Select } from "antd";
import { customEnumValues, enumKeys, enumOptions, enumValues } from "./filter-values";
import { useMmd } from "./provider";
import type { FieldRendererProps } from "./types";

/** 使用内部键隔离 Ant Select 的值类型限制，业务值保持 boolean/number/string。 */
export function EnumSelect({ field, value, disabled, onChange, multiple = false }: FieldRendererProps & { multiple?: boolean }) {
  const { t } = useMmd();
  const localized = (field.options ?? []).map((option) => {
    const key = `options.${field.name}.${String(option.value)}`;
    const label = t(key);
    return { ...option, label: label === key ? option.label : label };
  });
  const options = enumOptions({ options: localized, value });
  const keys = enumKeys({ options, value });
  if (multiple && field.allowCustom === true) return <Select mode="tags" allowClear disabled={disabled}
    style={{ width: "100%" }} value={customEnumValues(value)} options={localized.filter((option) => typeof option.value === "string")}
    onChange={(values: string[]) => onChange?.(values)} />;
  return <Select mode={multiple ? "multiple" : undefined} allowClear showSearch disabled={disabled}
    style={{ width: "100%" }} aria-label={field.label ?? field.name}
    value={multiple ? keys : keys[0]} optionFilterProp="label"
    options={options.map((option, index) => ({ label: option.label, value: String(index) }))}
    onChange={(next: string[] | string | undefined) => {
      const values = enumValues({ options, keys: Array.isArray(next) ? next : next === undefined ? [] : [next] });
      onChange?.(multiple ? values ?? [] : values?.[0] ?? null);
    }} />;
}
