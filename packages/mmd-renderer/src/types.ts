import type { ComponentType, ReactNode } from "react";

export type MmdRecord = Record<string, unknown>;
export type FieldScene = "list" | "detail" | "form" | "search";

export interface RendererField {
  name: string;
  label?: string;
  type?: string;
  fieldType?: string;
  renderType?: string;
  renderer?: string;
  required?: boolean;
  readOnly?: boolean;
  options?: Array<{ label: string; value: unknown; color?: string }>;
  dictName?: string;
  [key: string]: unknown;
}

export type ActionKind =
  | "new"
  | "edit"
  | "detail"
  | "save"
  | "submit"
  | "delete"
  | "del"
  | "refresh"
  | "view"
  | "get"
  | "post"
  | "custom"
  | (string & {});

export interface ActionCondition {
  field: string;
  operator?: "eq" | "neq" | "in" | "notIn" | "truthy" | "falsy";
  value?: unknown;
}

export interface RendererAction {
  name?: string;
  label: string;
  type?: ActionKind;
  placement?: "page" | "row" | "bulk";
  tone?: "default" | "primary" | "danger";
  viewName?: string;
  url?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  handler?: string;
  extend?: string;
  confirm?: boolean | string;
  visible?: boolean | ActionCondition;
  disabled?: boolean | ActionCondition;
  refresh?: boolean;
  showExpression?: string;
  [key: string]: unknown;
}

export interface RendererSearchConfig {
  fields: RendererField[];
}

export interface RendererDataContainer {
  name: string;
  label?: string;
  type: "list" | "detail" | "form" | "tableForm" | (string & {});
  key?: string;
  keyField?: string;
  fields: RendererField[];
  search?: RendererSearchConfig;
  actions?: RendererAction[];
  dataActions?: RendererAction[];
  pageSize?: number;
  [key: string]: unknown;
}

export interface RendererView {
  name: string;
  label?: string;
  type: string;
  dataContainers: RendererDataContainer[];
  component?: string;
  [key: string]: unknown;
}

export interface RendererModel {
  name: string;
  label?: string;
  pluralLabel?: string;
  primaryKey?: string;
  displayField?: string;
  fields: RendererField[];
  fieldsObject?: Record<string, RendererField>;
  actions?: RendererAction[];
  dataActions?: RendererAction[];
  [key: string]: unknown;
}

export interface RendererDictOption {
  label: string;
  value: unknown;
  color?: string;
  index?: number;
}

export type RendererDictionary =
  | RendererDictOption[]
  | Record<string, RendererDictOption>;

export interface RendererMeta {
  models: Record<string, RendererModel>;
  views: Record<string, RendererView>;
  dicts: Record<string, RendererDictionary>;
}

export interface MetaQuery {
  models?: string[];
  views?: string[];
  dicts?: string[];
}

export interface MmdListInput {
  model: string;
  fields?: string[];
  page?: number;
  pageSize?: number;
  where?: MmdRecord;
  search?: MmdRecord;
}

export interface MmdListResult {
  rows: MmdRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MmdGetInput {
  model: string;
  id: string;
  fields?: string[];
}

export interface MmdSaveInput {
  model: string;
  id?: string;
  row: MmdRecord;
  fields?: string[];
}

export interface MmdRemoveInput {
  model: string;
  ids: string[];
}

export interface MmdActionInput {
  action: string;
  model: string;
  ids?: string[];
  payload?: unknown;
  /** The current renderer record. It is sent to the API as `payload`. */
  row?: MmdRecord;
  url?: string;
  method?: string;
}

export interface MmdClient {
  getMeta(input: MetaQuery): Promise<RendererMeta>;
  list(input: MmdListInput): Promise<MmdListResult>;
  get(input: MmdGetInput): Promise<MmdRecord | null>;
  save(input: MmdSaveInput): Promise<MmdRecord>;
  remove(input: MmdRemoveInput): Promise<{ affected: number }>;
  executeAction(input: MmdActionInput): Promise<unknown>;
}

export interface OpenViewInput {
  model: string;
  view: string;
  id?: string;
}

export interface ActionExecutionResult {
  data?: unknown;
  refresh?: boolean;
  close?: boolean;
  navigate?: string;
}

export interface ActionExecutionContext {
  model: string;
  client: MmdClient;
  keyField?: string;
  record?: MmdRecord;
  selectedRecords?: MmdRecord[];
  selectedIds?: string[];
  openView?: (input: OpenViewInput) => void;
  navigate?: (path: string) => void;
  refresh?: () => void | Promise<void>;
  submit?: () => Promise<MmdRecord | undefined>;
  close?: () => void;
}

export type ActionHandler = (
  context: ActionExecutionContext,
  action: RendererAction,
) => ActionExecutionResult | void | Promise<ActionExecutionResult | void>;

export interface FieldRendererProps<T = unknown> {
  field: RendererField;
  value: T;
  record?: MmdRecord;
  scene: FieldScene;
  disabled?: boolean;
  onChange?: (value: T) => void;
}

export type FieldRenderer<T = unknown> = ComponentType<FieldRendererProps<T>>;

export interface FieldRenderers {
  default?: FieldRenderer<any>;
  list?: FieldRenderer<any>;
  detail?: FieldRenderer<any>;
  form?: FieldRenderer<any>;
  search?: FieldRenderer<any>;
}

export interface PageSlotProps {
  view?: RendererView;
  model?: RendererModel;
  id?: string;
}

export type PageSlot = ReactNode | ((props: PageSlotProps) => ReactNode);

export interface MmdPageSlots {
  beforeView?: PageSlot;
  afterView?: PageSlot;
  beforeContainer?: PageSlot;
  afterContainer?: PageSlot;
  loading?: PageSlot;
  error?: PageSlot;
  empty?: PageSlot;
}
