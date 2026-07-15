import type { ActionDefinition } from "./action";
import type { FieldDefinition } from "./field";
import { ModelFieldType } from "./field";
import { RenderType } from "./view";

export enum PageStyle {
  All = "All",
  List = "List",
  Detail = "Detail",
  New = "New",
  Edit = "Edit",
  ReadOnly = "ReadOnly",
  Search = "Search"
}

export interface ModelDefinition {
  name: string;
  /** 数据适配器使用的真实表或 delegate 名称。 */
  tableName?: string;
  displayField?: string;
  label?: string;
  pluralLabel?: string;
  primaryKey?: string;
  fields: FieldDefinition[];
  fieldsObject?: Record<string, FieldDefinition>;
  dataLog?: boolean;
  dbSource?: string;
  actions?: ActionDefinition[];
  dataActions?: ActionDefinition[];
}

export type IModel = ModelDefinition;

export interface ModelFieldMapperItem {
  fieldType: ModelFieldType;
  tableRenderType?: RenderType;
  detailRenderType?: RenderType;
  formRenderType?: RenderType;
  searchRenderType?: RenderType;
  formSpan?: number;
}

export type ModelFieldMapperDefinition = Partial<
  Record<ModelFieldType, ModelFieldMapperItem>
>;

export const ModelFieldMapper: ModelFieldMapperDefinition = {
  [ModelFieldType.Boolean]: {
    fieldType: ModelFieldType.Boolean,
    tableRenderType: RenderType.BooleanDetail,
    detailRenderType: RenderType.BooleanDetail,
    formRenderType: RenderType.Switch,
    searchRenderType: RenderType.BooleanSelect
  },
  [ModelFieldType.DateTime]: {
    fieldType: ModelFieldType.DateTime,
    tableRenderType: RenderType.DateTimeDetail,
    detailRenderType: RenderType.DateTimeDetail,
    formRenderType: RenderType.DateTime,
    searchRenderType: RenderType.DateTimeRange
  },
  [ModelFieldType.Multi]: {
    fieldType: ModelFieldType.Multi,
    tableRenderType: RenderType.MultiDetail,
    detailRenderType: RenderType.MultiDetail,
    formRenderType: RenderType.MultiSelect,
    searchRenderType: RenderType.MultiSelect,
    formSpan: 0
  },
  [ModelFieldType.Single]: {
    fieldType: ModelFieldType.Single,
    tableRenderType: RenderType.SingleDetail,
    detailRenderType: RenderType.SingleDetail,
    formRenderType: RenderType.Single,
    searchRenderType: RenderType.MultiSelect,
    formSpan: 2
  },
  [ModelFieldType.Number]: {
    fieldType: ModelFieldType.Number,
    tableRenderType: RenderType.Detail,
    detailRenderType: RenderType.Detail,
    formRenderType: RenderType.Number,
    searchRenderType: RenderType.NumberRange
  },
  [ModelFieldType.Text]: {
    fieldType: ModelFieldType.Text,
    tableRenderType: RenderType.Detail,
    detailRenderType: RenderType.Detail,
    formRenderType: RenderType.Text,
    searchRenderType: RenderType.Text
  },
  [ModelFieldType.ToMany]: {
    fieldType: ModelFieldType.ToMany,
    tableRenderType: RenderType.ToManyDetail,
    detailRenderType: RenderType.ToManyDetail,
    formSpan: 0
  },
  [ModelFieldType.ToOne]: {
    fieldType: ModelFieldType.ToOne,
    tableRenderType: RenderType.ToOneDetail,
    detailRenderType: RenderType.ToOneDetail,
    formRenderType: RenderType.ToOneEdit,
    formSpan: 2
  },
  [ModelFieldType.Key]: {
    fieldType: ModelFieldType.Key,
    tableRenderType: RenderType.Detail,
    detailRenderType: RenderType.Detail,
    formRenderType: RenderType.Text
  },
  [ModelFieldType.Html]: {
    fieldType: ModelFieldType.Html,
    detailRenderType: RenderType.HtmlDetail,
    formRenderType: RenderType.Html,
    formSpan: 0
  },
  [ModelFieldType.TextArea]: {
    fieldType: ModelFieldType.TextArea,
    formRenderType: RenderType.TextArea,
    formSpan: 0
  },
  [ModelFieldType.LinkOne]: {
    fieldType: ModelFieldType.LinkOne,
    tableRenderType: RenderType.LinkOneDetail,
    detailRenderType: RenderType.Detail,
    formRenderType: RenderType.Text,
    formSpan: 0
  },
  [ModelFieldType.LinkMany]: {
    fieldType: ModelFieldType.LinkMany,
    formRenderType: RenderType.TextArea,
    formSpan: 0
  },
  [ModelFieldType.Duration]: {
    fieldType: ModelFieldType.Duration,
    tableRenderType: RenderType.DurationDetail,
    detailRenderType: RenderType.DurationDetail,
    formSpan: 0
  }
};

export type IModelFieldMapperItem = ModelFieldMapperItem;
export type IModelFieldMapper = ModelFieldMapperDefinition;
