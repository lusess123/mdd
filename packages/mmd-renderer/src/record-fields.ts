import type { RendererField } from "./types";

/** 实际查询字段包括条件关联的判别字段；标签/字典变化保持同一数组引用。 */
export function createRecordFieldsSelector() {
  let previous: string[] = [];
  return (fields: readonly RendererField[]) => {
    const requested = [...new Set([
      ...fields.map(field => field.name),
      ...fields.flatMap(field => (field.references ?? []).flatMap(reference => reference.when ? [reference.when.field] : [])),
    ])];
    if (previous.length !== requested.length || requested.some((name, index) => name !== previous[index])) previous = requested;
    return previous;
  };
}
