"use client";
import Link from "next/link";
import { CodeBlock } from "./code-block";
import { useMmd } from "./mmd-provider";

const embedded = `import {
  MmdProvider, MmdResourcePage, ReferenceProvider,
  createFetchMmdRequest, createHttpMmdClient, createReferenceData,
  withClientLifecycle,
} from "mmd-renderer";

// Create these once per session; recreate on account/permission/locale changes.
const base = createHttpMmdClient(createFetchMmdRequest({
  api: { baseUrl: "https://api.example.com/api", credentials: "include", timeoutMs: 10000 },
  auth: { mode: "anonymous" },
}));
const references = createReferenceData({ client: base, resources: [
  { name: "Category", primaryKey: "id", displayField: "name" },
  { name: "Item", primaryKey: "id", displayField: "name" },
] });
const client = withClientLifecycle({
  client: base, afterMutation: () => references.invalidate(),
});
const resource = {
  name: "Category", label: "Categories", references: [],
  children: [{ model: "Item", field: "categoryId", label: "Items" }],
};
const resources = [resource, {
  name: "Item", label: "Items", children: [],
  references: [{ field: "categoryId", target: "Category" }],
}];

<MmdProvider client={client} locale="en-US">
  <ReferenceProvider data={references}>
    <MmdResourcePage resource={resource} resources={resources}
      view="listview" list={{ keyFirst: true, persistQuery: false }} />
  </ReferenceProvider>
</MmdProvider>`;
const filters = `// mmd-contracts: field definitions in your ModelDefinition
{ name: "id", fieldType: "Key", list: true, readOnly: true,
  filter: { kind: "id", primary: true } }
{ name: "name", fieldType: "Text", filter: { kind: "text", primary: true } }
{ name: "categoryId", fieldType: "ToOne", references: [{ target: "Category" }],
  filter: { kind: "reference", primary: true } }
{ name: "status", fieldType: "Single", options: [
  { label: "Numeric zero", value: 0 }, { label: "Text zero", value: "0" },
  { label: "False", value: false },
], filter: { kind: "enum" } }
{ name: "active", fieldType: "Boolean", filter: { kind: "boolean", primary: false } }
{ name: "amount", fieldType: "Number", decimal: true,
  filter: { kind: "number", decimal: true, primary: false } }
{ name: "createdAt", fieldType: "DateTime", filter: { kind: "datetime", primary: false } }

// A list container opts into compact filters and row numbers.
{ type: "list", showRowNumber: true,
  search: { layout: "compact", fields: searchableFields } }`;
const lifecycle = `// Optional hooks; business validation and permissions remain on the server.
const client = withClientLifecycle({
  client: base,
  before: { save: async (input) => (await confirmSave()) ? input : null },
  afterMutation: () => references.invalidate(),
});
// Built-in modal close already guards dirty forms.
// Other destructive host changes can share the same guard:
const guard = createChangeGuard();
<MmdProvider client={client} changeGuard={guard}>...</MmdProvider>
await guard.request({ confirm: confirmDiscard, commit: changeContext });`;

export function ReleaseDocs() {
  const { locale } = useMmd();
  const text = (zh: string, en: string) => (locale === "zh-CN" ? zh : en);
  return (
    <>
      <section className="doc-section" id="embedded">
        <h2>0.2.0 · {text("内嵌 CRUD 接入", "Embedded CRUD integration")}</h2>
        <p>
          {text(
            "不传 onOpenView 即使用内置弹窗。Shell、菜单与框架路由由宿主管理；组件不要求 URL 联动。默认查询状态保存在实例内。需要 URL 时再启用 persistQuery 或注入 queryState。",
            "Omit onOpenView to use built-in dialogs. The host owns its shell, menu and framework routing. State stays in the component instance by default; opt into persistQuery or queryState only when URL integration is needed.",
          )}
        </p>
        <CodeBlock code={embedded} label="tsx" />
        <p>
          {text(
            "Key 的 list: true 开放列表和详情显示；编辑视图需要显式添加 renderer: key 字段。showRowNumber 只用于列表序号，不属于数据或写入字段。JSON 使用 type: json，提供格式化与提交前校验。",
            "Key with list: true is visible in lists and details. Explicitly add renderer: key to an edit view to show its readonly ID. showRowNumber is display-only. Use type: json for formatting and validation before submit.",
          )}
        </p>
        <Link href="/playground/embedded">
          {text("打开可操作示例", "Open the interactive example")} →
        </Link>
      </section>
      <section className="doc-section" id="filters">
        <h2>
          {text("筛选、枚举与精确数值", "Filters, enums and exact values")}
        </h2>
        <CodeBlock code={filters} label="model / list metadata" />
        <p>
          {text(
            "Engine 将筛选转换为 eq、contains、in、gte/lte 条件。数值/时间区间允许单边为空；false、0 与字符串 0 保持不同类型。decimal 保留字符串精度，生产数据库适配器也必须做精确比较。",
            "Engine converts filters to eq, contains, in and gte/lte conditions. Either range endpoint can be empty. false, numeric zero and string zero remain distinct. decimal preserves string precision; production adapters must compare precisely too.",
          )}
        </p>
      </section>
      <section className="doc-section" id="relations">
        <h2>{text("关联字段与子表", "References and related lists")}</h2>
        <p>
          {text(
            "ReferenceProvider 支持批量名称解析、缓存失效、分页选择和缺失记录反馈。references 可声明 when: { field, value } 条件目标。资源的 children 声明子表模型与外键；关联新建继承默认值，where 固定父记录约束。切换标签页不重新查询主记录。",
            "ReferenceProvider batches labels, supports invalidation, paged selection and missing records. references can declare conditional targets with when: { field, value }. children declares related models and foreign keys; creates inherit defaults and where fixes the parent scope. Switching tabs does not reload the parent.",
          )}
        </p>
        <p>
          {text(
            "关联浏览不包含级联删除或嵌套事务写入。服务端负责访问控制和写入权限。",
            "Relation browsing does not imply cascading deletion or nested transactional writes. The server owns access and write permissions.",
          )}
        </p>
      </section>
      <section className="doc-section" id="lifecycle">
        <h2>
          {text("操作生命周期与表单保护", "Lifecycle and form protection")}
        </h2>
        <CodeBlock code={lifecycle} label="tsx" />
        <p>
          {text(
            "成功保存后才执行 afterMutation。操作取消不弹错误。版本记录工具只负责保存/传递版本，后端负责检查冲突，不自动重试冲突写入。示例右上角计数来自真实 afterMutation。",
            "afterMutation runs only after success. Cancellation does not show an error. Version helpers store and transmit versions; the backend checks conflicts, and conflicting writes are not automatically retried. The demo counter is driven by the real afterMutation hook.",
          )}
        </p>
      </section>
    </>
  );
}
