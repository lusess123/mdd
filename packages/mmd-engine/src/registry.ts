import {
  resolveFieldType,
  type Dict,
  type FieldDefinition,
  type MetaRequest,
  type MetaResponse,
  type ModelDefinition,
  type ModelFieldType,
  type ViewDefinition
} from "mmd-contracts";
import {
  modelToDetailView,
  modelToFormView,
  modelToListView
} from "./views";

function cloneField(field: FieldDefinition): FieldDefinition {
  return {
    ...field,
    pageStyle: field.pageStyle ? [...field.pageStyle] : undefined,
    options: field.options?.map((option) => ({ ...option }))
  };
}

function cloneModel(model: ModelDefinition): ModelDefinition {
  const fields = model.fields.map(cloneField);
  return {
    ...model,
    fields,
    fieldsObject: Object.fromEntries(fields.map((field) => [field.name, field])),
    actions: model.actions?.map((action) => ({ ...action })),
    dataActions: model.dataActions?.map((action) => ({ ...action }))
  };
}

function cloneDict(dict: Dict): Dict {
  return structuredClone(dict);
}

function cloneView(view: ViewDefinition): ViewDefinition {
  return structuredClone(view);
}

export function getModelMeta(
  model: ModelDefinition
): Record<string, ModelFieldType> {
  return Object.fromEntries(
    model.fields.map((field) => [field.name, resolveFieldType(field)])
  );
}

export class MmdRegistry {
  readonly #models = new Map<string, ModelDefinition>();
  readonly #dicts = new Map<string, Dict>();
  readonly #views = new Map<string, ViewDefinition>();

  registerModel(model: ModelDefinition): this {
    if (!model.name.trim()) throw new Error("Model name is required");
    if (!model.fields.length) throw new Error(`Model ${model.name} has no fields`);

    const names = new Set<string>();
    for (const field of model.fields) {
      if (!field.name.trim()) throw new Error(`Model ${model.name} has an unnamed field`);
      if (names.has(field.name)) {
        throw new Error(`Model ${model.name} has duplicate field ${field.name}`);
      }
      names.add(field.name);
    }

    this.#models.set(model.name, cloneModel(model));
    for (const suffix of ["listview", "detailview", "newview", "editview"]) {
      this.#views.delete(`${model.name}.${suffix}`);
    }
    return this;
  }

  setModel(name: string, model: ModelDefinition): this {
    return this.registerModel({ ...model, name });
  }

  getModel(name: string): ModelDefinition | undefined {
    const model = this.#models.get(name);
    return model ? cloneModel(model) : undefined;
  }

  registerDict(name: string, dict: Dict): this {
    const cloned = cloneDict(dict);
    const indexed = Object.fromEntries(
      Object.entries(cloned).map(([key, option], index) => [
        key,
        { ...option, index: option.index ?? index }
      ])
    );
    this.#dicts.set(name, indexed);
    return this;
  }

  setDict(name: string, dict: Dict): this {
    return this.registerDict(name, dict);
  }

  getDict(name: string): Dict | undefined {
    const dict = this.#dicts.get(name);
    return dict ? cloneDict(dict) : undefined;
  }

  registerView(name: string, view: ViewDefinition): this {
    this.#views.set(name, cloneView(view));
    return this;
  }

  setView(name: string, view: ViewDefinition): this {
    return this.registerView(name, view);
  }

  getView(name: string): ViewDefinition | undefined {
    const registered = this.#views.get(name);
    if (registered) return cloneView(registered);

    const separator = name.lastIndexOf(".");
    const modelName = separator === -1 ? name : name.slice(0, separator);
    const viewName = separator === -1 ? "listview" : name.slice(separator + 1);
    const model = this.getModel(modelName);
    if (!model) return undefined;

    const view =
      viewName === "detailview"
        ? modelToDetailView(model)
        : viewName === "newview"
          ? modelToFormView(model, "new")
          : viewName === "editview"
            ? modelToFormView(model, "edit")
            : modelToListView(model);
    this.#views.set(name, cloneView(view));
    return cloneView(view);
  }

  getModelFields(name: string): Record<string, FieldDefinition> | undefined {
    return this.getModel(name)?.fieldsObject;
  }

  getModelFieldTypes(name: string): Record<string, ModelFieldType> | undefined {
    const model = this.getModel(name);
    if (!model) return undefined;
    return getModelMeta(model);
  }

  getMeta(request: MetaRequest = {}): MetaResponse {
    const response: MetaResponse = { models: {}, views: {}, dicts: {} };
    const knownModels = new Set(request.hasModels ?? []);
    const knownViews = new Set([
      ...(request.hasViews ?? []),
      ...(request.hasCiews ?? [])
    ]);
    const knownDicts = new Set(request.hasDicts ?? []);
    const visitedModels = new Set<string>();

    const addDict = (name: string) => {
      if (knownDicts.has(name) || response.dicts[name]) return;
      const dict = this.getDict(name);
      if (dict) response.dicts[name] = cloneDict(dict);
    };

    const addModel = (name: string) => {
      if (visitedModels.has(name)) return;
      visitedModels.add(name);
      const model = this.getModel(name);
      if (!model) return;
      if (!knownModels.has(name)) response.models[name] = cloneModel(model);
      for (const field of model.fields) {
        if (field.relationModel) addModel(field.relationModel);
        const dictName = field.dictName ?? field.regName;
        if (dictName) addDict(dictName);
      }
    };

    for (const name of request.models ?? []) addModel(name);
    for (const name of request.dicts ?? []) addDict(name);
    for (const name of request.views ?? []) {
      if (knownViews.has(name)) continue;
      const view = this.getView(name);
      if (!view) continue;
      response.views[name] = cloneView(view);
      for (const container of view.dataContainers) addModel(container.name);
    }

    return response;
  }
}
