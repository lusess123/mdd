import type { ModelDefinition } from "mmd-contracts";

export type FilterOperator = "eq" | "contains" | "in" | "gte" | "lte";

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export type FilterExpression =
  | FilterCondition
  | { and: FilterExpression[] }
  | { or: FilterExpression[] };

export interface SortDefinition {
  field: string;
  direction: "asc" | "desc";
}

export interface AdapterFindManyInput {
  model: ModelDefinition;
  fields: string[];
  filter?: FilterExpression;
  sort: SortDefinition[];
  offset: number;
  limit: number;
}

export interface AdapterCountInput {
  model: ModelDefinition;
  filter?: FilterExpression;
}

export interface AdapterFindOneInput {
  model: ModelDefinition;
  key: string;
  value: string;
  fields: string[];
}

export interface AdapterCreateInput {
  model: ModelDefinition;
  data: Record<string, unknown>;
}

export interface AdapterUpdateInput {
  model: ModelDefinition;
  key: string;
  value: string;
  data: Record<string, unknown>;
}

export interface AdapterRemoveInput {
  model: ModelDefinition;
  key: string;
  value: string;
}

/** 数据库实现只需适配这六个稳定操作。 */
export interface MmdDataAdapter {
  findMany(input: AdapterFindManyInput): Promise<Record<string, unknown>[]>;
  count(input: AdapterCountInput): Promise<number>;
  findOne(input: AdapterFindOneInput): Promise<Record<string, unknown> | null>;
  create(input: AdapterCreateInput): Promise<Record<string, unknown>>;
  update(input: AdapterUpdateInput): Promise<Record<string, unknown>>;
  remove(input: AdapterRemoveInput): Promise<Record<string, unknown> | null>;
}
