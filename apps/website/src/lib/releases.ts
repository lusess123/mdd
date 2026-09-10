/** 已交付版本的文档和可操作示例入口；发布检查要求最新条目与三个包版本一致。 */
export const releases = [
  {
    version: "0.2.0",
    title: {
      zh: "完整内嵌 CRUD、筛选与关联",
      en: "Complete embedded CRUD, filters and relations",
    },
    features: [
      {
        id: "filters",
        zh: "七类紧凑筛选，保留 false、0 与精确小数",
        en: "Seven compact filters preserving false, zero and exact decimals",
        docs: "/docs#filters",
        demo: "/playground/embedded",
      },
      {
        id: "identifiers",
        zh: "可复制的只读 ID 与跨页连续序号",
        en: "Copyable readonly IDs and continuous row numbers",
        docs: "/docs#embedded",
        demo: "/playground/embedded",
      },
      {
        id: "relations",
        zh: "关联名称、分页选择、子表与默认值继承",
        en: "Reference labels, paged selection, related lists and inherited defaults",
        docs: "/docs#relations",
        demo: "/playground/embedded",
      },
      {
        id: "embedded",
        zh: "原生内嵌弹窗，无需自建业务路由",
        en: "Built-in dialogs without application routing",
        docs: "/docs#embedded",
        demo: "/playground/embedded",
      },
      {
        id: "lifecycle",
        zh: "变更生命周期、缓存刷新与未保存保护",
        en: "Mutation lifecycle, cache refresh and unsaved-change protection",
        docs: "/docs#lifecycle",
        demo: "/playground/embedded",
      },
    ],
  },
  {
    version: "0.1.2",
    title: {
      zh: "动作上下文与校验反馈修复",
      en: "Action context and validation feedback fixes",
    },
    features: [
      {
        id: "actions",
        zh: "保留行操作上下文，明确反馈表单校验错误",
        en: "Preserve row action context and explain form validation errors",
        docs: "/docs#section-04",
        demo: "/playground",
      },
    ],
  },
  {
    version: "0.1.1",
    title: {
      zh: "JSON 编辑与动作配置",
      en: "JSON editing and action configuration",
    },
    features: [
      {
        id: "json",
        zh: "JSON 格式化与提交校验，可关闭默认 CRUD 按钮",
        en: "JSON formatting and validation, configurable default CRUD buttons",
        docs: "/docs#embedded",
        demo: "/playground/embedded",
      },
    ],
  },
  {
    version: "0.1.0",
    title: { zh: "首个正式版本", en: "First stable release" },
    features: [
      {
        id: "baseline",
        zh: "模型协议、Engine、React CRUD、自定义字段与动作",
        en: "Model contracts, Engine, React CRUD, custom fields and actions",
        docs: "/docs",
        demo: "/playground",
      },
    ],
  },
] as const;
export const currentVersion = releases[0].version;
