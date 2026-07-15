import type {
  RendererDataContainer,
  RendererField,
  RendererDictionary,
  RendererMeta,
  RendererModel,
  RendererView,
} from "./types";

export function resolveContainerFields(
  container: RendererDataContainer,
  model?: RendererModel,
): RendererField[] {
  const modelFields = new Map(
    (model?.fields ?? []).map((field) => [field.name, field]),
  );
  for (const [name, field] of Object.entries(model?.fieldsObject ?? {})) {
    if (!modelFields.has(name)) modelFields.set(name, field);
  }

  return container.fields.map((field) => ({
    ...modelFields.get(field.name),
    ...field,
  }));
}

function dictionaryOptions(
  dictionary: RendererDictionary | undefined,
): RendererField["options"] | undefined {
  if (!dictionary) return undefined;
  return Array.isArray(dictionary) ? dictionary : Object.values(dictionary);
}

export function resolveFieldOptions(
  field: RendererField,
  meta: RendererMeta,
): RendererField {
  if (field.options) return field;
  const dictionaryName =
    typeof field.dictName === "string"
      ? field.dictName
      : typeof field.regName === "string"
        ? field.regName
        : typeof field.dict === "string"
          ? field.dict
          : undefined;
  const options = dictionaryOptions(
    dictionaryName ? meta.dicts[dictionaryName] : undefined,
  );
  return options ? { ...field, options } : field;
}

export function findModel(
  meta: RendererMeta,
  name: string,
): RendererModel | undefined {
  return (
    meta.models[name] ??
    Object.values(meta.models).find(
      (model) => model.name.toLowerCase() === name.toLowerCase(),
    )
  );
}

export function findView(
  meta: RendererMeta,
  name: string,
  model?: string,
): RendererView | undefined {
  const qualifiedName = model ? `${model}.${name}` : name;
  return (
    meta.views[qualifiedName] ??
    meta.views[name] ??
    Object.values(meta.views).find(
      (view) => view.name.toLowerCase() === qualifiedName.toLowerCase(),
    )
  );
}
