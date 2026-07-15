import type { ActionDefinition } from "./action";
import { ModelFieldType } from "./field";

export enum RenderType {
  Detail = "Detail",
  Text = "Text",
  Switch = "Switch",
  TextArea = "TextArea",
  Single = "Single",
  DateTime = "DateTime",
  DateTimeDetail = "DateTimeDetail",
  BooleanDetail = "BooleanDetail",
  SingleDetail = "SingleDetail",
  MultiDetail = "MultiDetail",
  MultiSelect = "MultiSelect",
  DateTimeRange = "DateTimeRange",
  Number = "Number",
  NumberRange = "NumberRange",
  Html = "Html",
  HtmlDetail = "HtmlDetail",
  ToOneDetail = "ToOneDetail",
  ToManyDetail = "ToManyDetail",
  ToOneEdit = "ToOneEdit",
  LinkOneDetail = "LinkOneDetail",
  BooleanSelect = "BooleanSelect",
  DurationDetail = "DurationDetail",

  /** @deprecated 请使用 DateTime。 */
  DataTime = "DateTime",
  /** @deprecated 请使用 DateTimeRange。 */
  DataTimeRange = "DateTimeRange",
  /** @deprecated 请使用 Html。 */
  HTML = "Html",
  /** @deprecated 请使用 HtmlDetail。 */
  HTMLDetail = "HtmlDetail"
}

export { RenderType as IRenderType };

export interface ViewField {
  name: string;
  label?: string;
  dictName?: string;
  /** @deprecated 请使用 dictName。 */
  regName?: string;
  renderType?: RenderType;
  /** 自定义字段渲染器注册名。 */
  type?: string;
  /** 自定义字段渲染器注册名。 */
  renderer?: string;
}

export interface SearchConfig {
  fields: ViewField[];
}

export interface DataContainer {
  name: string;
  label?: string;
  fields: ViewField[];
  keyField: string;
  key?: string;
  type: "list" | "form" | "detail" | "tableForm" | (string & {});
}

export interface ListDataContainer extends DataContainer {
  type: "list";
  search: SearchConfig;
  actions: ActionDefinition[];
  dataActions: ActionDefinition[];
}

export interface FormDataContainer extends DataContainer {
  type: "form";
  actions: ActionDefinition[];
}

export interface DetailDataContainer extends DataContainer {
  type: "detail";
}

export interface TableFormDataContainer extends DataContainer {
  type: "tableForm";
}

export interface ViewDefinition {
  type: string;
  label?: string;
  name: string;
  dataContainers: DataContainer[];
  component?: string;
}

export type IView = ViewDefinition;
export type IBaseField = ViewField;
export type IListField = ViewField;
export type ISearchField = ViewField;
export type ISearchConfig = SearchConfig;
export type IDataContainer = DataContainer;
export type IListDataContainer = ListDataContainer;
export type IFormDataContainer = FormDataContainer;
export type IDetailDataContainer = DetailDataContainer;
export type ITableFormDataContainer = TableFormDataContainer;

export const DefaultSearchFormFields: readonly ModelFieldType[] = [
  ModelFieldType.Boolean,
  ModelFieldType.DateTime,
  ModelFieldType.Single,
  ModelFieldType.Multi,
  ModelFieldType.Text
];

/** @deprecated 请使用 DefaultSearchFormFields。 */
export const DefaultSearFormFields = DefaultSearchFormFields;
