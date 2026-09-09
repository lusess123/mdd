import type { RendererField } from "./types";

/** 查询字段只随名称或顺序变化；字典、标签和其它模型元数据不应触发重载。 */
export function createRecordFieldsSelector() {
  let previous: string[] = [];
  return (fields: readonly RendererField[]) => {
    if (previous.length !== fields.length || fields.some((field, index) => field.name !== previous[index])) {
      previous = fields.map((field) => field.name);
    }
    return previous;
  };
}
