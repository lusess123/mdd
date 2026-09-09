import {
  ModelFieldType,
  PageStyle,
  resolveFieldType,
  type ActionDefinition,
  type ActionResponse,
  type FieldDefinition,
  type ListResponse,
  type MetaRequest,
  type MetaResponse,
  type ModelDefinition
} from "mmd-contracts";
import type {
  FilterCondition,
  FilterExpression,
  FilterOperator,
  MmdDataAdapter,
  SortDefinition
} from "./adapter";
import { MmdError } from "./errors";
import { MmdRegistry } from "./registry";

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface QueryListRequest {
  model: string;
  fields?: string[];
  page?: number;
  pageSize?: number;
  search?: Record<string, unknown>;
  filters?: QueryFilter[];
  sort?: SortDefinition[];
}

export interface QueryOneRequest {
  model: string;
  id: string;
  fields?: string[];
}

export interface SaveRequest {
  model: string;
  id?: string;
  data: Record<string, unknown>;
}

export interface RemoveRequest {
  model: string;
  id: string;
}

export interface ExecuteActionRequest {
  model: string;
  action: string;
  ids: string[];
  payload?: unknown;
}

export interface MmdActionResult<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T[];
  affected?: number;
}

export interface MmdActionContext {
  model: ModelDefinition;
  ids: string[];
  payload?: unknown;
  engine: Pick<MmdEngine, "queryOne" | "queryList" | "save" | "remove">;
}

export type MmdActionHandler = (
  context: MmdActionContext
) => Promise<MmdActionResult> | MmdActionResult;

export type MmdActionHandlers = Record<string, MmdActionHandler>;

export interface MmdEngineOptions {
  registry: MmdRegistry;
  adapter: MmdDataAdapter;
  maxPageSize?: number;
  defaultPageSize?: number;
  actions?: MmdActionHandlers;
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function combineAnd(filters: FilterExpression[]): FilterExpression | undefined {
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return { and: filters };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.trunc(value));
}

export class MmdEngine {
  readonly #registry: MmdRegistry;
  readonly #adapter: MmdDataAdapter;
  readonly #maxPageSize: number;
  readonly #defaultPageSize: number;
  readonly #actions: MmdActionHandlers;

  constructor(options: MmdEngineOptions) {
    this.#registry = options.registry;
    this.#adapter = options.adapter;
    this.#maxPageSize = Math.max(1, options.maxPageSize ?? 100);
    this.#defaultPageSize = Math.min(
      this.#maxPageSize,
      Math.max(1, options.defaultPageSize ?? 20)
    );
    this.#actions = { ...options.actions };
  }

  getMeta(request: MetaRequest = {}): MetaResponse {
    return this.#registry.getMeta(request);
  }

  async queryList<T extends Record<string, unknown> = Record<string, unknown>>(
    request: QueryListRequest
  ): Promise<ListResponse<T>> {
    const model = this.#getModel(request.model);
    const fields = this.#selectFields(model, request.fields);
    const filter = this.#buildFilter(model, request.search, request.filters);
    const sort = this.#buildSort(model, request.sort);
    const page = positiveInteger(request.page, 1);
    const requestedPageSize = positiveInteger(
      request.pageSize,
      this.#defaultPageSize
    );
    const pageSize = Math.min(this.#maxPageSize, requestedPageSize);

    const [data, total] = await Promise.all([
      this.#adapter.findMany({
        model,
        fields,
        filter,
        sort,
        offset: (page - 1) * pageSize,
        limit: pageSize
      }),
      this.#adapter.count({ model, filter })
    ]);

    return { data: data as T[], total, page, pageSize };
  }

  async queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
    request: QueryOneRequest
  ): Promise<T | null> {
    if (!request.id) throw new MmdError("INVALID_INPUT", "Record id is required");
    const model = this.#getModel(request.model);
    const result = await this.#adapter.findOne({
      model,
      key: this.#keyField(model),
      value: request.id,
      fields: this.#selectFields(model, request.fields)
    });
    return result as T | null;
  }

  async save<T extends Record<string, unknown> = Record<string, unknown>>(
    request: SaveRequest
  ): Promise<T> {
    const model = this.#getModel(request.model);
    const data = this.#sanitizeWrite(model, request.data, Boolean(request.id));
    if (request.id) {
      return (await this.#adapter.update({
        model,
        key: this.#keyField(model),
        value: request.id,
        data
      })) as T;
    }
    return (await this.#adapter.create({ model, data })) as T;
  }

  async remove<T extends Record<string, unknown> = Record<string, unknown>>(
    request: RemoveRequest
  ): Promise<T | null> {
    if (!request.id) throw new MmdError("INVALID_INPUT", "Record id is required");
    const model = this.#getModel(request.model);
    return (await this.#adapter.remove({
      model,
      key: this.#keyField(model),
      value: request.id
    })) as T | null;
  }

  async executeAction<T extends Record<string, unknown> = Record<string, unknown>>(
    request: ExecuteActionRequest
  ): Promise<ActionResponse<T>> {
    const model = this.#getModel(request.model);
    if (!request.action.trim()) {
      throw new MmdError("INVALID_INPUT", "Action name is required");
    }
    const ids = [...new Set(request.ids.filter(Boolean))];
    if (ids.length === 0) {
      throw new MmdError("INVALID_INPUT", "At least one record id is required");
    }

    const definition = [...(model.actions ?? []), ...(model.dataActions ?? [])].find(
      (action) => this.#actionName(action) === request.action
    );
    if (!definition) {
      throw new MmdError(
        "ACTION_NOT_FOUND",
        `Action is not declared: ${model.name}.${request.action}`,
        { model: model.name, action: request.action }
      );
    }

    if (
      request.action === "remove" ||
      request.action === "delete" ||
      request.action === "del"
    ) {
      const data = (
        await Promise.all(ids.map((id) => this.remove({ model: model.name, id })))
      ).filter((row): row is Record<string, unknown> => row !== null);
      return {
        action: request.action,
        affected: data.length,
        data: data as T[]
      };
    }

    const handlerName = definition.handler ?? definition.extend ?? request.action;
    const handler =
      this.#actions[`${model.name}.${handlerName}`] ?? this.#actions[handlerName];
    if (!handler) {
      throw new MmdError(
        "ACTION_NOT_FOUND",
        `Action handler is not registered: ${model.name}.${handlerName}`,
        { model: model.name, action: request.action, handler: handlerName }
      );
    }

    const result = await handler({
      model,
      ids,
      payload: request.payload,
      engine: this
    });
    return {
      action: request.action,
      affected: result.affected ?? result.data.length,
      data: result.data as T[]
    };
  }

  #getModel(name: string): ModelDefinition {
    const model = this.#registry.getModel(name);
    if (!model) {
      throw new MmdError("MODEL_NOT_FOUND", `Unknown model: ${name}`, { model: name });
    }
    return model;
  }

  #keyField(model: ModelDefinition): string {
    return (
      model.primaryKey ??
      model.fields.find((field) => resolveFieldType(field) === ModelFieldType.Key)
        ?.name ??
      "id"
    );
  }

  #fieldMap(model: ModelDefinition): Map<string, FieldDefinition> {
    return new Map(model.fields.map((field) => [field.name, field]));
  }

  #selectFields(model: ModelDefinition, requested?: string[]): string[] {
    const fields = this.#fieldMap(model);
    const key = this.#keyField(model);
    const names = requested?.length
      ? requested
      : model.fields
          .filter((field) => field.list !== false)
          .map((field) => field.name);
    const selected = [key];
    for (const name of names) {
      if (name !== key && !fields.has(name)) {
        throw new MmdError("FIELD_NOT_FOUND", `Unknown field: ${model.name}.${name}`, {
          model: model.name,
          field: name
        });
      }
      if (!selected.includes(name)) selected.push(name);
    }
    return selected;
  }

  #getField(model: ModelDefinition, name: string): FieldDefinition {
    const field = this.#fieldMap(model).get(name);
    if (!field && name === this.#keyField(model)) {
      return {
        name,
        fieldType: ModelFieldType.Key,
        readOnly: true
      };
    }
    if (!field) {
      throw new MmdError("FIELD_NOT_FOUND", `Unknown field: ${model.name}.${name}`, {
        model: model.name,
        field: name
      });
    }
    return field;
  }

  #buildSearchCondition(
    field: FieldDefinition,
    value: unknown
  ): FilterExpression | undefined {
    if (!isPresent(value) || (Array.isArray(value) && value.length === 0)) return undefined;
    if (field.filter === false) throw new MmdError("INVALID_FILTER", `Search is disabled for field ${field.name}`);
    const kind = field.filter?.kind;
    if (kind === "id" || kind === "reference" || kind === "boolean")
      return { field: field.name, operator: "eq", value };
    if (kind === "enum")
      return { field: field.name, operator: Array.isArray(value) ? "in" : "eq", value };
    if (kind === "text") return { field: field.name, operator: "contains", value };
    const type = resolveFieldType(field);
    if ((kind === "number" || kind === "datetime") && (!Array.isArray(value) || value.length !== 2))
      throw new MmdError("INVALID_FILTER", `Expected a two-ended range for field ${field.name}`);
    if ((kind === "number" || kind === "datetime" || type === ModelFieldType.DateTime) && Array.isArray(value)) {
      const range: FilterExpression[] = [];
      if (isPresent(value[0])) range.push({ field: field.name, operator: "gte", value: value[0] });
      if (isPresent(value[1])) range.push({ field: field.name, operator: "lte", value: value[1] });
      return combineAnd(range);
    }
    if (type === ModelFieldType.Number && Array.isArray(value)) {
      const range: FilterExpression[] = [];
      if (isPresent(value[0])) range.push({ field: field.name, operator: "gte", value: value[0] });
      if (isPresent(value[1])) range.push({ field: field.name, operator: "lte", value: value[1] });
      return combineAnd(range);
    }
    if (type === ModelFieldType.Single && Array.isArray(value)) {
      return { field: field.name, operator: "in", value };
    }
    if (type === ModelFieldType.Multi && Array.isArray(value)) {
      return {
        or: value.map((item) => ({
          field: field.name,
          operator: "contains" as const,
          value: item
        }))
      };
    }
    if (type === ModelFieldType.Text || type === ModelFieldType.TextArea) {
      return { field: field.name, operator: "contains", value };
    }
    return { field: field.name, operator: "eq", value };
  }

  #buildFilter(
    model: ModelDefinition,
    search?: Record<string, unknown>,
    requestedFilters?: QueryFilter[]
  ): FilterExpression | undefined {
    const filters: FilterExpression[] = [];
    for (const [name, value] of Object.entries(search ?? {})) {
      const condition = this.#buildSearchCondition(this.#getField(model, name), value);
      if (condition) filters.push(condition);
    }
    for (const filter of requestedFilters ?? []) {
      const field = this.#getField(model, filter.field);
      this.#assertOperator(field, filter.operator);
      filters.push({ ...filter } satisfies FilterCondition);
    }
    return combineAnd(filters);
  }

  #assertOperator(field: FieldDefinition, operator: FilterOperator): void {
    const type = resolveFieldType(field);
    const allowed: FilterOperator[] =
      type === ModelFieldType.Text || type === ModelFieldType.TextArea
        ? ["eq", "contains", "in"]
        : type === ModelFieldType.Number || type === ModelFieldType.DateTime
          ? ["eq", "in", "gte", "lte"]
          : ["eq", "in"];
    if (!allowed.includes(operator)) {
      throw new MmdError(
        "INVALID_FILTER",
        `Operator ${operator} is not allowed for field ${field.name}`,
        { field: field.name, operator }
      );
    }
  }

  #buildSort(model: ModelDefinition, requested?: SortDefinition[]): SortDefinition[] {
    if (requested?.length) {
      return requested.map((sort) => {
        this.#getField(model, sort.field);
        if (sort.direction !== "asc" && sort.direction !== "desc") {
          throw new MmdError("INVALID_INPUT", `Invalid sort direction: ${sort.direction}`);
        }
        return { ...sort };
      });
    }
    if (model.fields.some((field) => field.name === "updatedAt")) {
      return [{ field: "updatedAt", direction: "desc" }];
    }
    return [{ field: this.#keyField(model), direction: "asc" }];
  }

  #sanitizeWrite(
    model: ModelDefinition,
    input: Record<string, unknown>,
    isUpdate: boolean
  ): Record<string, unknown> {
    if (!input || Array.isArray(input) || typeof input !== "object") {
      throw new MmdError("INVALID_INPUT", "Record data must be an object");
    }
    const fields = this.#fieldMap(model);
    const key = this.#keyField(model);
    const data: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(input)) {
      const field = fields.get(name);
      if (!field) {
        throw new MmdError("FIELD_NOT_FOUND", `Unknown field: ${model.name}.${name}`, {
          model: model.name,
          field: name
        });
      }
      const type = resolveFieldType(field);
      const readOnly =
        name === key ||
        field.readOnly ||
        field.pageStyle?.includes(PageStyle.ReadOnly) ||
        type === ModelFieldType.Key ||
        type === ModelFieldType.ToMany;
      if (readOnly) {
        throw new MmdError("INVALID_INPUT", `Field is read-only: ${model.name}.${name}`, {
          model: model.name,
          field: name
        });
      }
      data[name] = value;
    }

    if (!isUpdate) {
      for (const field of model.fields) {
        if (
          field.required &&
          !field.readOnly &&
          resolveFieldType(field) !== ModelFieldType.Key &&
          !isPresent(data[field.name])
        ) {
          throw new MmdError(
            "INVALID_INPUT",
            `Required field is missing: ${model.name}.${field.name}`,
            { model: model.name, field: field.name }
          );
        }
      }
    }

    if (Object.keys(data).length === 0) {
      throw new MmdError("INVALID_INPUT", "Record data has no writable fields");
    }
    return data;
  }

  #actionName(action: ActionDefinition): string {
    if (action.name) return action.name;
    if (action.handler) return action.handler;
    if (action.extend) return action.extend;
    return action.type === "del" ? "delete" : (action.type ?? "");
  }
}
