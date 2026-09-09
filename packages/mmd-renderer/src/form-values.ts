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

/** 新建默认值只填入已声明的可写字段；主键和只读字段不会被外部参数覆盖。 */
export function initialFormValues({
  fields,
  keyField,
  defaults = {},
}: {
  fields: RendererField[];
  keyField: string;
  defaults?: MmdRecord;
}): MmdRecord {
  const declared = Object.fromEntries(
    fields
      .filter((field) => field.defaultValue !== undefined)
      .map((field) => [field.name, field.defaultValue]),
  );
  return {
    ...declared,
    ...writableFormValues({ values: defaults, fields, keyField }),
  };
}
