import type { RendererField, RendererMeta } from "../types";

/** 主键在列表/详情/表单只读，搜索场景仍允许输入。 */
export function withReadonlyIdentifier({
  field,
  keyField,
  search = false,
}: {
  field: RendererField;
  keyField: string;
  search?: boolean;
}): RendererField {
  return field.name === keyField
    ? {
        ...field,
        type: search ? "text" : "key",
        renderer: search ? "text" : "key",
        readOnly: !search,
      }
    : field;
}
/** 所有模型/视图/搜索字段走同一个扩展函数；返回新元数据，不改写客户端缓存。 */
export function mapMetadataFields({
  meta,
  map,
  primaryKey,
}: {
  meta: RendererMeta;
  map: (input: {
    field: RendererField;
    model: string;
    keyField: string;
    search: boolean;
  }) => RendererField;
  primaryKey?: (model: string) => string | undefined;
}): RendererMeta {
  const fieldsFor = (model: string, fields: RendererField[], search = false) =>
    fields.map((field) =>
      map({
        field,
        model,
        keyField: meta.models[model]?.primaryKey ?? primaryKey?.(model) ?? "id",
        search,
      }),
    );
  return {
    ...meta,
    models: Object.fromEntries(
      Object.entries(meta.models).map(([name, model]) => [
        name,
        {
          ...model,
          fields: fieldsFor(name, model.fields),
        },
      ]),
    ),
    views: Object.fromEntries(
      Object.entries(meta.views).map(([name, view]) => [
        name,
        {
          ...view,
          dataContainers: view.dataContainers.map((container) => ({
            ...container,
            fields: fieldsFor(container.name, container.fields),
            ...(container.search
              ? {
                  search: {
                    ...container.search,
                    fields: fieldsFor(
                      container.name,
                      container.search.fields,
                      true,
                    ),
                  },
                }
              : {}),
          })),
        },
      ]),
    ),
  };
}
