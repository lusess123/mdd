import {
  DefaultSearchFormFields,
  ModelFieldMapper,
  ModelFieldType,
  PageStyle,
  resolveFieldType,
  type ActionDefinition,
  type DataContainer,
  type DetailDataContainer,
  type FieldDefinition,
  type FormDataContainer,
  type ListDataContainer,
  type ModelDefinition,
  type ViewDefinition,
  type ViewField,
} from "mmd-contracts";

function keyField(model: ModelDefinition): string {
  return (
    model.primaryKey ??
    model.fields.find((field) => resolveFieldType(field) === ModelFieldType.Key)
      ?.name ??
    "id"
  );
}

function isVisible(
  field: FieldDefinition,
  style: PageStyle,
  allowReadOnly: boolean,
): boolean {
  if (!field.pageStyle?.length) return true;
  return (
    field.pageStyle.includes(style) ||
    field.pageStyle.includes(PageStyle.All) ||
    (allowReadOnly && field.pageStyle.includes(PageStyle.ReadOnly))
  );
}

function toViewField(
  field: FieldDefinition,
  render:
    | "tableRenderType"
    | "detailRenderType"
    | "formRenderType"
    | "searchRenderType",
): ViewField {
  const mapper = ModelFieldMapper[resolveFieldType(field)];
  return {
    name: field.name,
    label: field.label,
    dictName: field.dictName ?? field.regName,
    regName: field.dictName ?? field.regName,
    renderType: field.type ? undefined : mapper?.[render],
    type: field.type,
    renderer:
      field.type ??
      (resolveFieldType(field) === ModelFieldType.Key ? "key" : undefined),
  };
}

export function modelToListView(model: ModelDefinition): ViewDefinition {
  const fields = model.fields.filter((field) => {
    const type = resolveFieldType(field);
    return (
      field.list !== false &&
      (type !== ModelFieldType.Key || field.list === true) &&
      type !== ModelFieldType.ToMany &&
      isVisible(field, PageStyle.List, true)
    );
  });

  const actions: ActionDefinition[] = [
    ...(model.defaultActions === false
      ? []
      : [
          {
            label: "new",
            type: "new" as const,
            name: "new",
            placement: "page" as const,
          },
          {
            label: "refresh",
            type: "refresh" as const,
            name: "refresh",
            placement: "page" as const,
          },
        ]),
    ...(model.actions ?? []).filter((action) => action.placement !== "row"),
  ];
  const dataActions: ActionDefinition[] = [
    ...(model.dataActions ?? []),
    ...(model.actions ?? []).filter((action) => action.placement === "row"),
    ...(model.defaultActions === false
      ? []
      : [
          {
            label: "detail",
            type: "detail" as const,
            name: "detail",
            placement: "row" as const,
          },
          {
            label: "edit",
            type: "edit" as const,
            name: "edit",
            placement: "row" as const,
          },
          {
            label: "remove",
            type: "delete" as const,
            name: "remove",
            placement: "row" as const,
            tone: "danger" as const,
          },
        ]),
  ];

  const container: ListDataContainer = {
    name: model.name,
    type: "list",
    fields: fields.map((field) => toViewField(field, "tableRenderType")),
    search: {
      fields: model.fields
        .filter(
          (field) =>
            resolveFieldType(field) !== ModelFieldType.Key &&
            DefaultSearchFormFields.includes(resolveFieldType(field)) &&
            isVisible(field, PageStyle.Search, false),
        )
        .map((field) => toViewField(field, "searchRenderType")),
    },
    keyField: keyField(model),
    actions,
    dataActions,
  };

  return {
    label: model.label ?? model.name,
    name: `${model.name}.listview`,
    type: "list",
    dataContainers: [container],
  };
}

export function modelToDetailView(model: ModelDefinition): ViewDefinition {
  const container: DetailDataContainer = {
    name: model.name,
    type: "detail",
    label: model.label ?? model.name,
    fields: model.fields
      .filter(
        (field) =>
          (resolveFieldType(field) !== ModelFieldType.Key || field.list === true) &&
          resolveFieldType(field) !== ModelFieldType.ToMany &&
          isVisible(field, PageStyle.Detail, true),
      )
      .map((field) => toViewField(field, "detailRenderType")),
    keyField: keyField(model),
  };

  return {
    label: model.label ?? model.name,
    name: `${model.name}.detailview`,
    type: "detail",
    dataContainers: [container],
  };
}

export function modelToFormView(
  model: ModelDefinition,
  mode: "new" | "edit" = "new",
): ViewDefinition {
  const style = mode === "new" ? PageStyle.New : PageStyle.Edit;
  const container: FormDataContainer = {
    name: model.name,
    type: "form",
    label: model.label ?? model.name,
    fields: model.fields
      .filter((field) => {
        const type = resolveFieldType(field);
        return (
          !field.readOnly &&
          type !== ModelFieldType.Key &&
          type !== ModelFieldType.ToMany &&
          isVisible(field, style, false)
        );
      })
      .map((field) => toViewField(field, "formRenderType")),
    keyField: keyField(model),
    actions: [
      {
        label: "submit",
        type: "submit",
        name: "submit",
        placement: "page",
        tone: "primary",
      },
    ],
  };

  return {
    label: model.label ?? model.name,
    name: `${model.name}.${mode}view`,
    type: mode,
    dataContainers: [container],
  };
}

/** @deprecated 请使用 modelToFormView。 */
export const modelToNewView = (model: ModelDefinition): ViewDefinition =>
  modelToFormView(model, "new");

export function getContainer<T extends DataContainer = DataContainer>(
  view: ViewDefinition,
): T | undefined {
  return view.dataContainers[0] as T | undefined;
}
