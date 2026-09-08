import type { MmdRecord, RendererField } from "./types";

/** 主键及只读字段可以显式展示，但不能作为可编辑输入或写入载荷。 */
export function isReadOnlyField(
  field: RendererField,
  keyField: string,
): boolean {
  return (
    field.name === keyField ||
    field.readOnly === true ||
    String(field.fieldType ?? field.type).toLowerCase() === "key" ||
    (Array.isArray(field.pageStyle) && field.pageStyle.includes("ReadOnly"))
  );
}

/** 只提交当前表单已声明的可写值；保留 false、0、null 和 JSON 原始类型。 */
export function writableFormValues({
  values,
  fields,
  keyField,
}: {
  values: MmdRecord;
  fields: readonly RendererField[];
  keyField: string;
}): MmdRecord {
  return Object.fromEntries(
    fields
      .filter(
        (field) =>
          !isReadOnlyField(field, keyField) &&
          Object.hasOwn(values, field.name),
      )
      .map((field) => [field.name, values[field.name]]),
  );
}
