import type { MmdLocale } from "./i18n";

/** 按界面语言分组数字；字符串小数保留全部精度和末尾零，不转换为浮点数。 */
export function formatDecimalValue({
  value,
  locale = "zh-CN",
}: {
  value: unknown;
  locale?: MmdLocale;
}) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number")
    return Number.isFinite(value)
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(
          value,
        )
      : String(value);
  if (typeof value === "bigint")
    return new Intl.NumberFormat(locale).format(value);
  if (typeof value !== "string" || !/^[+-]?\d+(?:\.\d+)?$/.test(value))
    return String(value);
  const [integer = "0", fraction] = value.replace(/^[+-]/, "").split(".");
  const sign = /^[+-]/.test(value) ? value[0] : "";
  const decimal =
    new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value ?? ".";
  return `${sign}${new Intl.NumberFormat(locale).format(BigInt(integer))}${fraction === undefined ? "" : `${decimal}${fraction}`}`;
}

