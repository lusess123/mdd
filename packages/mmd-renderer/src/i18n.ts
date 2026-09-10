export type MmdLocale = "zh-CN" | "en-US";
export type MmdMessages = Record<string, string>;
export type MmdMessageOverrides = Partial<Record<MmdLocale, MmdMessages>>;
export type MmdMessageCatalog = Record<MmdLocale, MmdMessages>;

export function detectMmdLocale(
  ...values: Array<string | null | undefined>
): MmdLocale {
  const preferred = values.find((value) => /^(zh|en)/i.test(value ?? ""));
  return preferred?.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}

const zhCN: MmdMessages = {
  "form.discardTitle": "放弃未保存的修改？",
  "form.discardDescription": "关闭后将丢失当前表单的未保存内容。",
  "form.discard": "放弃修改",
  "form.keepEditing": "继续编辑",
  "resource.management": "数据管理",
  "resource.new": "新增",
  "resource.edit": "编辑",
  "resource.detail": "详情",
  "resource.create": "可新增",
  "resource.delete": "可删除",
  "resource.readOnly": "只读查询",
  "resource.references": "{count} 个关联字段",
  "resource.children": "{count} 类关联数据",
  "resource.back": "返回来源",
  "resource.filtered": "已按关联条件筛选",
  "resource.clearFilter": "清除关联筛选",

  "common.loading": "加载中…",
  "common.yes": "是",
  "common.no": "否",
  "common.noData": "暂无数据",
  "common.cancel": "取消",
  "common.confirm": "确定",
  "common.actions": "操作",
  "common.search": "搜索",
  "common.reset": "重置",
  "common.rowNumber": "序号",
  "common.copy": "复制",
  "common.copied": "已复制",
  "actions.new": "新建",
  "actions.edit": "编辑",
  "actions.detail": "详情",
  "actions.save": "保存",
  "actions.submit": "提交",
  "actions.delete": "删除",
  "actions.del": "删除",
  "actions.refresh": "刷新",
  "feedback.saved": "保存成功",
  "feedback.deleted": "删除成功",
  "feedback.actionDone": "操作成功",
  "errors.timeout": "请求超时，请稍后重试",
  "errors.network": "无法连接 API",
  "errors.unknown": "发生未知错误",
  "errors.meta": "元数据加载失败",
  "errors.viewNotFound": "找不到视图：{view}",
  "errors.containerNotFound": "不支持容器类型：{type}",
  "errors.code.VALIDATION_ERROR": "请求数据不正确",
  "errors.code.SKU_CONFLICT": "SKU 已存在",
  "errors.code.RECORD_NOT_FOUND": "记录不存在",
  "errors.code.PRODUCT_NOT_FOUND": "记录不存在",
  "errors.code.ACTION_NOT_FOUND": "操作不存在",
  "errors.code.MODEL_NOT_FOUND": "模型不存在",
  "errors.code.FIELD_NOT_FOUND": "字段不存在",
  "errors.code.NOT_FOUND": "请求的资源不存在",
  "errors.code.SESSION_RECORD_LIMIT": "当前演示会话最多保留 50 条记录",
  "errors.code.RATE_LIMITED": "请求过于频繁，请稍后重试",
  "errors.code.INTERNAL_ERROR": "服务暂时不可用",
  "validation.required": "请填写{field}",
  "validation.json": "JSON 格式不正确，请检查引号、逗号和括号",
  "validation.form": "请先修正表单中标出的字段",
  "json.format": "格式化 JSON",
};

const enUS: MmdMessages = {
  "form.discardTitle": "Discard unsaved changes?",
  "form.discardDescription": "Closing will discard the unsaved changes in this form.",
  "form.discard": "Discard changes",
  "form.keepEditing": "Keep editing",
  "resource.management": "Data management",
  "resource.new": "New",
  "resource.edit": "Edit",
  "resource.detail": "Details",
  "resource.create": "Create",
  "resource.delete": "Delete",
  "resource.readOnly": "Read only",
  "resource.references": "{count} reference fields",
  "resource.children": "{count} related resources",
  "resource.back": "Back to source",
  "resource.filtered": "Filtered by related record",
  "resource.clearFilter": "Clear relation filter",

  "common.loading": "Loading…",
  "common.yes": "Yes",
  "common.no": "No",
  "common.noData": "No data",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.actions": "Actions",
  "common.search": "Search",
  "common.reset": "Reset",
  "common.rowNumber": "No.",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "actions.new": "New",
  "actions.edit": "Edit",
  "actions.detail": "Detail",
  "actions.save": "Save",
  "actions.submit": "Submit",
  "actions.delete": "Delete",
  "actions.del": "Delete",
  "actions.refresh": "Refresh",
  "feedback.saved": "Saved",
  "feedback.deleted": "Deleted",
  "feedback.actionDone": "Action completed",
  "errors.timeout": "Request timed out. Try again.",
  "errors.network": "Cannot connect to the API",
  "errors.unknown": "An unknown error occurred",
  "errors.meta": "Failed to load metadata",
  "errors.viewNotFound": "View not found: {view}",
  "errors.containerNotFound": "Unsupported container type: {type}",
  "errors.code.VALIDATION_ERROR": "Invalid request data",
  "errors.code.SKU_CONFLICT": "SKU already exists",
  "errors.code.RECORD_NOT_FOUND": "Record not found",
  "errors.code.PRODUCT_NOT_FOUND": "Record not found",
  "errors.code.ACTION_NOT_FOUND": "Action not found",
  "errors.code.MODEL_NOT_FOUND": "Model not found",
  "errors.code.FIELD_NOT_FOUND": "Field not found",
  "errors.code.NOT_FOUND": "Resource not found",
  "errors.code.SESSION_RECORD_LIMIT": "Demo sessions are limited to 50 records",
  "errors.code.RATE_LIMITED": "Too many requests. Try again shortly.",
  "errors.code.INTERNAL_ERROR": "Service temporarily unavailable",
  "validation.required": "{field} is required",
  "validation.json": "Invalid JSON. Check quotes, commas and brackets.",
  "validation.form": "Correct the highlighted form fields before saving.",
  "json.format": "Format JSON",
};

export function createMessageCatalog(
  overrides: MmdMessageOverrides = {},
): MmdMessageCatalog {
  return {
    "zh-CN": { ...zhCN, ...overrides["zh-CN"] },
    "en-US": { ...enUS, ...overrides["en-US"] },
  };
}

export function translate(
  catalog: MmdMessageCatalog,
  locale: MmdLocale,
  key: string,
  params: Record<string, string | number> = {},
): string {
  const message = catalog[locale][key] ?? catalog["zh-CN"][key] ?? key;
  return message.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] === undefined ? `{${name}}` : String(params[name]),
  );
}

export function translateMetadataLabel(
  t: (key: string) => string,
  scope: "models" | "fields",
  name: string,
  fallback?: string,
): string {
  const key = `${scope}.${name}`;
  const translated = t(key);
  return translated === key ? (fallback ?? name) : translated;
}
