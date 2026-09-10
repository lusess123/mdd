import type { FieldFilter } from "mmd-contracts";
import type { RendererField } from "./types";
import type { MmdLocale } from "./i18n";

/** 显式配置优先；传统范围/布尔/枚举渲染名仍可推断语义。 */
export function filterMetadata(field: RendererField): FieldFilter {
  if (field.filter) return field.filter;
  const type = String(field.fieldType ?? field.renderType ?? field.type ?? "").toLowerCase();
  const kind = /number|money|duration/.test(type) ? "number"
    : /date.*time/.test(type) ? "datetime"
    : /boolean|switch/.test(type) ? "boolean"
    : /single|multi|status|tags/.test(type) ? "enum"
    : type === "key" ? "id"
    : field.relationModel || field.references?.length ? "reference" : "text";
  return { kind, decimal: field.decimal };
}

/** 清空条件不会误删 false 和 0。 */
export function normalizeFilters(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => !isEmptyFilter(value)));
}

export function isEmptyFilter(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** 历史查询中的未收录值也作为可移除选项显示，不改变其原始类型。 */
export function enumOptions({
  options = [],
  value,
}: {
  options?: RendererField["options"];
  value: unknown;
}) {
  const selected: readonly unknown[] = Array.isArray(value)
    ? value
    : isEmptyFilter(value)
      ? []
      : [value];
  const result = [...options];
  for (const item of selected) {
    if (!result.some((option) => Object.is(option.value, item)))
      result.push({ label: String(item), value: item });
  }
  return result;
}

/** 开放候选使用原始字符串；这里只投影显示值，不回写旧 URL 的标量查询。 */
export function customEnumValues(value: unknown) {
  const selected: readonly unknown[] = Array.isArray(value)
    ? value
    : isEmptyFilter(value)
      ? []
      : [value];
  return selected.filter((item) => typeof item === "string");
}

export function enumKeys({
  options = [],
  value,
}: {
  options?: RendererField["options"];
  value: unknown;
}) {
  const selected: readonly unknown[] = Array.isArray(value)
    ? value
    : isEmptyFilter(value)
      ? []
      : [value];
  return options.flatMap((option, index) =>
    selected.some((value) => Object.is(value, option.value))
      ? [String(index)]
      : [],
  );
}

export function enumValues({
  options = [],
  keys,
}: {
  options?: RendererField["options"];
  keys: string[];
}) {
  const values = keys.flatMap((key) => {
    const option = options[Number(key)];
    return option ? [option.value] : [];
  });
  return values.length ? values : undefined;
}

export function rangeBounds(value: unknown) {
  const values: readonly unknown[] = Array.isArray(value) ? value : [];
  return {
    /** 含边界的下界；null 表示不限制下界。 */
    lower: values[0] ?? null,
    /** 含边界的上界；null 表示不限制上界。 */
    upper: values[1] ?? null,
  };
}

export function updateRange({
  value,
  edge,
  next,
}: {
  value: unknown;
  edge: "lower" | "upper";
  next: unknown;
}) {
  const bounds = rangeBounds(value);
  const lower =
    edge === "lower" ? (isEmptyFilter(next) ? null : next) : bounds.lower;
  const upper =
    edge === "upper" ? (isEmptyFilter(next) ? null : next) : bounds.upper;
  return lower === null && upper === null ? undefined : [lower, upper];
}

function decimalParts(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  if (typeof value === "string" && !/^[+-]?\d+(?:\.\d+)?$/.test(value))
    return null;
  const match = /^([+-]?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(
    String(value),
  );
  if (!match) return null;
  const digits = `${match[2] ?? ""}${match[3] ?? ""}`.replace(/^0+/, "") || "0";
  return {
    /** 去除前导零的十进制有效数字，不使用浮点数转换。 */
    digits,
    /** 小数位数；仅有限 number 的科学计数法可以产生负值。 */
    scale: (match[3]?.length ?? 0) - Number(match[4] ?? 0),
    /** 零统一按非负处理，避免 -0 改变范围顺序。 */
    negative: match[1] === "-" && digits !== "0",
  };
}

function compareDecimals({
  lower,
  upper,
}: {
  lower: NonNullable<ReturnType<typeof decimalParts>>;
  upper: NonNullable<ReturnType<typeof decimalParts>>;
}) {
  if (lower.digits === "0" && upper.digits === "0") return 0;
  if (lower.negative !== upper.negative) return lower.negative ? -1 : 1;
  const lowerExponent =
    lower.digits === "0" ? -Infinity : lower.digits.length - lower.scale;
  const upperExponent =
    upper.digits === "0" ? -Infinity : upper.digits.length - upper.scale;
  let comparison = Math.sign(lowerExponent - upperExponent);
  if (lowerExponent === upperExponent) {
    const width = Math.max(lower.digits.length, upper.digits.length);
    const left = lower.digits.padEnd(width, "0");
    const right = upper.digits.padEnd(width, "0");
    comparison = left === right ? 0 : left > right ? 1 : -1;
  }
  return lower.negative ? -comparison : comparison;
}

const localDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const instantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
function instant(value: unknown) {
  if (typeof value !== "string" || !instantPattern.test(value))
    return null;
  if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) return null;
  const day = value.slice(0, 10);
  const calendar = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** 日期输入显示浏览器本地时间；有效输入转成带 Z 的 ISO 时间，无效输入保留供校验。 */
export function localDateTimeToIso(value: string) {
  if (!value) return null;
  const match = localDateTimePattern.exec(value);
  if (!match) return value;
  const date = new Date(value);
  const components = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  ];
  const expected = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
    Number((match[7] ?? "").padEnd(3, "0")),
  ];
  return components.every((part, index) => part === expected[index])
    ? date.toISOString()
    : value;
}

export function localDateTimeValue(value: unknown) {
  if (typeof value === "string" && localDateTimePattern.test(value))
    return value;
  const date = instant(value);
  if (!date) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${date.getMilliseconds() ? `.${String(date.getMilliseconds()).padStart(3, "0")}` : ""}`;
}

/** 返回可直接用于 Form.rules 的本地化错误；空值、false 和 0 分别处理。 */
export function validateFilterValue({
  field,
  value,
  locale = "zh-CN",
}: {
  field: RendererField;
  value: unknown;
  locale?: MmdLocale;
}) {
  if (isEmptyFilter(value)) return undefined;
  const { kind, allowCustom } = filterMetadata(field);
  const t = (text: { zh: string; en: string }) =>
    locale === "en-US" ? text.en : text.zh;
  if (kind === "boolean")
    return typeof value === "boolean"
      ? undefined
      : t({ zh: "请选择全部、是或否", en: "Select All, Yes or No" });
  if (kind === "enum" && allowCustom)
    return typeof value === "string" ||
      (Array.isArray(value) && value.every((item) => typeof item === "string"))
      ? undefined
      : t({
          zh: "请选择或输入文字值",
          en: "Choose or enter text values",
        });
  if (kind !== "number" && kind !== "datetime") return undefined;
  if (!Array.isArray(value) || value.length !== 2)
    return t({
      zh: "请填写有效的范围，可留空任一端",
      en: "Enter a valid range; either end may be left blank",
    });
  const { lower, upper } = rangeBounds(value);
  if (kind === "number") {
    const left = isEmptyFilter(lower) ? null : decimalParts(lower);
    const right = isEmptyFilter(upper) ? null : decimalParts(upper);
    if ((!isEmptyFilter(lower) && !left) || (!isEmptyFilter(upper) && !right))
      return t({ zh: "请输入有效数值", en: "Enter a valid number" });
    if (left && right && compareDecimals({ lower: left, upper: right }) > 0)
      return t({
        zh: "最小值不能大于最大值",
        en: "The minimum cannot exceed the maximum",
      });
  } else {
    const left = isEmptyFilter(lower) ? null : instant(lower);
    const right = isEmptyFilter(upper) ? null : instant(upper);
    if ((!isEmptyFilter(lower) && !left) || (!isEmptyFilter(upper) && !right))
      return t({
        zh: "请输入有效的本地日期和时间",
        en: "Enter a valid local date and time",
      });
    if (left && right && left.getTime() > right.getTime())
      return t({
        zh: "起始时间不能晚于结束时间",
        en: "The start cannot be after the end",
      });
  }
  return undefined;
}
