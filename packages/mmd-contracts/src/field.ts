/** MMD 内置字段语义。自定义渲染器名称放在 FieldDefinition.type。 */
export enum ModelFieldType {
  Key = "Key",
  Text = "Text",
  TextArea = "TextArea",
  Html = "Html",
  Number = "Number",
  DateTime = "DateTime",
  Boolean = "Boolean",
  Single = "Single",
  Multi = "Multi",
  ToOne = "ToOne",
  ToMany = "ToMany",
  LinkOne = "LinkOne",
  LinkMany = "LinkMany",
  Duration = "Duration",

  /** @deprecated 请使用 Html。 */
  HTML = "Html",
  /** @deprecated 请使用 ToOne。 */
  toOne = "ToOne",
  /** @deprecated 请使用 ToMany。 */
  toManay = "ToMany",
  /** @deprecated 请使用 LinkOne。 */
  linkOne = "LinkOne",
  /** @deprecated 请使用 LinkMany。 */
  linkManay = "LinkMany"
}

export type LegacyModelFieldType =
  | "HTML"
  | "toOne"
  | "toManay"
  | "toMany"
  | "linkOne"
  | "linkManay"
  | "linkMany";

export type ModelFieldTypeInput = ModelFieldType | LegacyModelFieldType;

const legacyFieldTypes: Record<LegacyModelFieldType, ModelFieldType> = {
  HTML: ModelFieldType.Html,
  toOne: ModelFieldType.ToOne,
  toManay: ModelFieldType.ToMany,
  toMany: ModelFieldType.ToMany,
  linkOne: ModelFieldType.LinkOne,
  linkManay: ModelFieldType.LinkMany,
  linkMany: ModelFieldType.LinkMany
};

export function normalizeModelFieldType(
  fieldType: ModelFieldTypeInput
): ModelFieldType {
  return legacyFieldTypes[fieldType as LegacyModelFieldType] ?? fieldType;
}

/**
 * 渲染器注册名。内置 demo 使用以下名称，使用方也可以传入任意自定义名称。
 */
export type FieldType =
  | "text"
  | "image"
  | "money"
  | "tags"
  | "status"
  | "number"
  | "datetime"
  | (string & {});

export interface FieldOption<T = string> {
  label: string;
  value: T;
  color?: string;
}

export interface FieldDefinition {
  name: string;
  label?: string;
  fieldType?: ModelFieldTypeInput;
  /** 自定义字段渲染器的注册名。 */
  type?: FieldType;
  required?: boolean;
  readOnly?: boolean;
  /** Key 默认隐藏；显式 true 时在列表和详情显示，仍受 pageStyle 控制。 */
  list?: boolean;
  /** 多选编辑器允许新增字符串候选；默认只允许选择已知值。 */
  allowCustom?: boolean;
  options?: FieldOption<string | number | boolean>[];
  /** 标准筛选配置；false 明确禁用自动生成筛选。 */
  filter?: import("./filter").FieldFilter | false;
  /** 条件关联目标；优先于 relationModel。 */
  references?: import("./filter").FieldReference[];
  /** 数值编辑保留字符串精度。 */
  decimal?: boolean;
  pageStyle?: import("./model").PageStyle[];
  relationModel?: string;
  dictName?: string;
  /** @deprecated 请使用 dictName。 */
  regName?: string;
  foreignKey?: string;
  span?: number;
  detailTemplate?: string;
  /** @deprecated 请使用 detailTemplate。 */
  detailTpl?: string;
}

export type IModelField = FieldDefinition;

const rendererFieldTypes: Record<string, ModelFieldType> = {
  text: ModelFieldType.Text,
  image: ModelFieldType.Text,
  money: ModelFieldType.Number,
  tags: ModelFieldType.Multi,
  status: ModelFieldType.Single,
  number: ModelFieldType.Number,
  datetime: ModelFieldType.DateTime
};

export function resolveFieldType(field: FieldDefinition): ModelFieldType {
  if (field.fieldType) return normalizeModelFieldType(field.fieldType);
  return rendererFieldTypes[field.type ?? ""] ?? ModelFieldType.Text;
}
