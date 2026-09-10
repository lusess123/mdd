/** 标准筛选语义；数据库适配器负责执行和再次校验，不代表访问授权。 */
export interface FieldFilter {
  /** text 包含匹配；id/reference 精确匹配；enum 多值匹配；范围两端均包含。 */
  kind: "text" | "id" | "reference" | "enum" | "boolean" | "number" | "datetime";
  /** 开放枚举允许输入候选之外的字符串。 */
  allowCustom?: boolean;
  /** false 时归入可折叠的更多筛选；未设置时作为常用筛选。 */
  primary?: boolean;
  /** 数值输入使用十进制字符串，避免 Decimal/BigInt 精度丢失。 */
  decimal?: boolean;
}

/** 多态外键的候选目标，按条件唯一匹配后才提供记录选择器。 */
export interface FieldReference {
  /** 目标模型名称，必须由服务端开放查询权限。 */
  target: string;
  /** 判别条件；没有条件时表示默认目标。 */
  when?: {
    /** 当前记录中的判别字段名。 */
    field: string;
    /** 严格等值比较，保留字符串、数字和布尔类型。 */
    value: string | number | boolean;
  };
}
