export type MmdLocale = "zh-CN" | "en-US";
export type MmdMessages = Record<string, string>;
export type MmdMessageOverrides = Partial<Record<MmdLocale, MmdMessages>>;
export type MmdMessageCatalog = Record<MmdLocale, MmdMessages>;

export function detectMmdLocale(...values: Array<string | null | undefined>): MmdLocale {
  const preferred = values.find((value) => /^(zh|en)/i.test(value ?? ""));
  return preferred?.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}

const zhCN: MmdMessages = {
  "common.loading": "加载中…",
  "common.noData": "暂无数据",
  "common.cancel": "取消",
  "common.confirm": "确定",
  "common.actions": "操作",
  "common.search": "搜索",
  "common.reset": "重置",
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
  "validation.required": "请填写{field}",
};

const enUS: MmdMessages = {
  "common.loading": "Loading…",
  "common.noData": "No data",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.actions": "Actions",
  "common.search": "Search",
  "common.reset": "Reset",
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
  "validation.required": "{field} is required",
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
