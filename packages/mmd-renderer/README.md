# mmd-renderer

MMD 的 React 渲染器，根据元数据生成列表、详情和表单。支持中英文、响应式布局、自定义字段与按钮，以及 API、认证、路由和错误处理配置。

```bash
npm install mmd-contracts mmd-renderer react react-dom antd
```

React、React DOM 和 Ant Design 由宿主项目提供。当前示例验证于 React 19、Ant Design 6。

[使用与扩展文档](https://mmd.zyking.xyz/docs/) · [在线示例](https://mmd.zyking.xyz/playground/) · [源码](https://github.com/lusess123/mdd) · MIT

### JSON fields (0.1.1)

Use `{ name: "config", type: "json", required: true }` to render a JSON editor with a format button and submit-time syntax validation. The editor keeps JSON text as its value (including primitives such as `false`, `0`, and `null`); parse and validate the business shape on your backend. Optional empty fields remain empty. Detail/list scenes display formatted JSON.

### Read-only identifiers and row numbers (unreleased)

`Key` fields with explicit `list: true` are visible in generated list/detail views and stay hidden from generated forms. An explicit edit-view field can use `renderer: "key"` to display a full, copyable ID. `ReadonlyIdentifier` is also exported for custom tables inside `MmdProvider`. Explicit primary-key and read-only form fields are disabled and omitted from write payloads; backend write protection remains unchanged.

Set `showRowNumber: true` on a list container to prepend a `No.` / `序号` column. The default is `false`. Rows, numbers, and Table pagination use the same successful response snapshot, including while another page is loading or fails. Changing the page size requests page 1; a failed request can be retried with the same page size.

Custom Ant Design tables can use `createRowNumberColumn({ page, pageSize, title })`. Pass the page and size belonging to the currently displayed rows to both this helper and Table pagination; pending pagination values can make Table slice the old rows again. This column has no `dataIndex` and must not be added to model fields or API query fields.

详情记录请求只依赖模型、记录 ID 和查询字段名称/顺序。加载其它模型元数据、切换关联选项卡、更新字典或字段标签不会再次请求主记录；展示文案和选项仍随元数据更新。新增/删除查询字段、切换记录或显式刷新时继续请求。该行为内置于 DetailContainer，接入方无需通过隔离 Provider 避免无关重载。

## Standard filters and references

Fields can declare `filter: { kind, primary?, allowCustom?, decimal? }`. The seven kinds are
`text`, `id`, `reference`, `enum`, `boolean`, `number`, and `datetime`.
`filter: false` disables generated search. `mmd-engine` carries the configuration into
views and builds inclusive range / exact / contains / IN conditions without converting
Decimal strings to numbers. Database adapters remain responsible for input validation,
permissions and precise comparison; the renderer is not an authorization boundary.

```tsx
const fields = [
  { name: 'id', fieldType: 'Key', list: true, filter: { kind: 'id' } },
  { name: 'amount', fieldType: 'Number', decimal: true,
    filter: { kind: 'number', decimal: true, primary: false } },
  { name: 'state', fieldType: 'Single', options: [{ label: 'Pending', value: 0 }],
    filter: { kind: 'enum' } },
];
// In list metadata:
const search = { layout: 'compact', fields };
```

`FilterForm` is also exported for custom lists. It offers a responsive 4/2/1-column layout,
advanced-field folding, reset and validation. Applied advanced values stay visible.
`FilterField` can be embedded in an existing Ant Form; export helpers in `filter-values`
share the same semantics. Boolean false and numeric zero survive clearing/normalization.
Closed enums preserve types and historical values; open enum filters accept strings.
Date ranges display local wall time and send ISO instants, including seconds and milliseconds;
either endpoint may be empty. Invalid dates and reversed ranges are rejected.
`formatDecimalValue` formats Decimal strings and BigInt without float conversion.
The built-in numeric editor uses `decimal: true` for string mode and clears to null.
Enum form controls preserve boolean/number/string values; multi-select is closed by default,
and `allowCustom: true` enables string tags.

```tsx
const references = createReferenceData({
  client,
  resources: [{ name: 'people', primaryKey: 'id', displayField: 'name' }],
  // Optional searchQuery({ resource, term }) controls exact ID detection/search.
});
<ReferenceProvider data={references}
  href={({ model, id }) => `/records/${model}/${encodeURIComponent(id)}`}
  navigate={navigate}>
  <MmdView model="orders" view="listview" />
</ReferenceProvider>
```

Create one reference service per authenticated session. Call `invalidate()` after a mutation;
recreate the service when account, permissions or locale change. Lookup batches are deduplicated
and chunked; failed requests remain retryable. Invalidation isolates late label/search responses.
The built-in `reference`, `ToOne` and `LinkOne` fields support async labels, paginated search,
selected values outside the current page, missing-record feedback and host-provided navigation.
Without a provider, editing falls back to the raw ID input. `ToMany`/`LinkMany` continue to use
the existing representation; this API does not imply nested writes or cascading deletion.

Conditional foreign keys use `references: [{ target, when?: { field, value } }]`.
A matching condition takes priority over the unconditional default. An ambiguous target falls
back to ID input. A single-element filter array can select a target without changing the query.

List/detail/edit data queries depend on requested field names, not dictionary or unrelated
metadata identities. Loading related metadata does not reload a parent row or erase an edit draft.
Use stable client/config objects in the host. Key fields and read-only metadata are excluded
from save payloads; server-side validation is still required.
