export type ActionPlacement = "page" | "row" | "bulk";
export type ActionTone = "default" | "primary" | "danger";

export type BuiltInActionType =
  | "new"
  | "edit"
  | "detail"
  | "submit"
  | "delete"
  | "refresh"
  | "view"
  | "get"
  | "post"
  | "custom";

export type LegacyActionType = "del" | "";

export interface ActionDefinition {
  /** 动作处理器注册名；内置动作可省略并使用 type。 */
  name?: string;
  label: string;
  type?: BuiltInActionType | LegacyActionType;
  placement?: ActionPlacement;
  tone?: ActionTone;
  viewName?: string;
  url?: string;
  handler?: string;
  /** @deprecated 请使用 handler。 */
  extend?: string;
  confirm?: string | boolean;
  showExpression?: string;
}

export type IAction = ActionDefinition;

export interface ActionRequest {
  ids: string[];
  payload?: unknown;
}

export interface ActionResponse<T = unknown> {
  action: string;
  affected: number;
  data: T[];
}

export interface ActionParam<T extends Record<string, unknown> = Record<string, unknown>> {
  model: string;
  id: string;
  row: T;
  fields: string[];
}

export interface ListActionParam extends ActionParam {
  pageIndex: number;
  pageSize: number;
  where?: unknown;
  search?: Record<string, unknown>;
}

export interface FormActionResult<T = unknown> {
  model: string;
  row: T;
}

export type IActionParam = ActionParam;
export type IListActionParam = ListActionParam;
export type IFormActionParam = ActionParam;
export type IFormActionResult = FormActionResult;
