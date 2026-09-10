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

## Application extensions

These opt-in APIs compose the existing renderer; they do not embed a host's authentication, model permissions, business audit rules or URL conventions.

- `createUrlQueryState<T>` provides independent URL parameter state with injected parsing and location writes. JSON is the default; scalar tabs can supply `serialize`/`deserialize`. Invalid state returns a fresh `initial()`. The host's `replaceSearch` must preserve unrelated history state and hash. `subscribe` can bridge router/back navigation.
- `ListContainer` accepts `queryState`, `initialQuery`, `sortOptions`, `defaults`, `keyFirst`, `appearance="plain"`, `mapSearch`, `onFilterChange` and `afterFilters`. Query changes reset selections; filter/sort changes start at page one. Fixed `where` fields are omitted from the filter form. Pagination and row numbers use the last successful response. The query adapter and `mapSearch` should be stable React references.
- `RelatedRecords` renders only the selected related list, persists its tab through an optional adapter, and supplies a separate `queryKey`, fixed `where` and inherited creation `defaults` to `renderList`. `relatedListContext` shares only matching reference targets, including conditional targets. Parent constraints win over defaults. Tab changes do not query the parent; `revision` explicitly refreshes its reference data. This is relation navigation, not nested transactional writes.
- `createNavigationTrail` accepts injected location/history access and an `isResource` predicate. It preserves unrelated state, bounds the return stack, and filters destinations through that predicate. Applications retain their own route format and fallback destination.
- `mapMetadataFields` applies one immutable field mapper to models, views and search containers. `withReadonlyIdentifier` uses the built-in key renderer for display/edit and text for search. Number precision, references and identifiers use the default field registry without host re-registration.
- `withClientLifecycle` supports typed `before.save/remove/executeAction` hooks and a success-only `afterMutation` callback. Returning `null` cancels before the request with `MmdCancelledError`, which ActionButtons handles without an error toast. A host can perform audit prompts or payload policy in these hooks. `createRecordVersionStore` stores model/id versions under a configurable header; create one per account/session and explicitly capture response versions. Cross-origin APIs must expose that header. Conflict writes are never automatically retried.
- `createChangeGuard` tracks dirty forms by ID, ignores clean forms and deduplicates pending confirmations. Share the guard through `MmdProvider changeGuard={guard}` and call `guard.request({ confirm, commit })` for locale switches or other destructive context changes. FormContainer registers changes, clears on save and unregisters on unmount. The host supplies confirmation UI and owns locale preference persistence. Provider metadata is scoped to client + locale, so late old-language results cannot pollute the new scope.

```tsx
const queryState = useMemo(() => createUrlQueryState({
  key: "productsQuery",
  initial: () => ({ search: {}, sort: [], page: 1, pageSize: 20 }),
  parse: value => productQuerySchema.parse(value),
  readSearch: () => location.search,
  replaceSearch: search => history.replaceState(history.state, "", location.pathname + search + location.hash),
}), []);

<ListContainer container={container} model={model} queryState={queryState}
  appearance="plain" keyFirst
  sortOptions={[{ label: "Name", value: "name", sort: [{ field: "name", direction: "asc" }] }]} />
```

The query schema and sort field allowlist in this example belong to the host. Backend authorization remains authoritative for all list, relation and mutation requests.

Application shells, site navigation menus, branding, login and account state belong to the host application. MMD provides the metadata-driven CRUD components and their supporting protocols; it does not export an application layout.

### Direct CRUD entry

Use the public entry for lists, detail, edit and create views. It loads metadata, chooses the container, handles errors and forwards list configuration without requiring host wrappers:

```tsx
<MmdRenderer
  model="orders"
  view="listview"
  list={{ persistQuery: true, appearance: "plain", keyFirst: true }}
  onOpenView={({ model, view, id, defaults }) => router.open({ model, view, id, defaults })}
/>
```

`defaults` initializes declared writable fields on create forms. New-record actions carry relationship defaults through `onOpenView` or the built-in modal. They never turn a parent's primary key into the new record ID. The server must still authorize and validate writes.

For detail pages, pass `relations={{ resource, resources }}` to render related tabs and their standard MmdRenderer lists automatically. `relations.onOpenList` connects full-list navigation and `relations.className` styles the related section. With list persistence enabled, child tabs use separate `relatedQuery.<model>.<field>` keys and the selected tab uses `related`; a custom `tabState` is optional. Switching tabs does not refresh the parent, while a successful detail action refreshes both the record and its relation context. Shell, headings and business navigation remain host-owned.

`list.queryState` remains available for a custom router or storage; it overrides `persistQuery`. Browser defaults preserve history state, other query keys and hash. Query parsing enforces valid pagination and configured sort choices, and retains false, numeric/string enums and exact decimal strings. `createHttpMmdClient` serializes `where` as canonical Engine `filters`; custom `MmdClient` implementations continue to receive `where` directly.

### 标准资源页

`MmdResourcePage` 在 `MmdRenderer` 的 CRUD 能力上提供单个资源的标题、可写能力标签、关联筛选提示及关联列表。使用相同的 Provider；中文/英文及消息覆盖沿用 Provider 配置。`resource` 提供名称、说明、能力和关系，`resources` 提供可见关联资源；能力标签不代替服务端鉴权。

```tsx
<MmdResourcePage
  resource={resource}
  resources={resources}
  view="listview"
  where={relationFilter}
  defaults={createDefaults}
  list={{ persistQuery: true, keyFirst: true }}
  onOpenView={({ model, view, id, where, defaults }) => router.open({ model, view, id, where, defaults })}
  onClose={() => router.back()}
/>
```

`onOpenView` 的关联列表请求携带固定 `where` 与新建 `defaults`；清除关联筛选时重新打开无约束列表。省略路由回调时普通 CRUD 沿用内置弹窗，资源页不显示无法执行的返回/清除按钮。可通过 `mmd-resource-heading`、`mmd-resource-eyebrow`、`mmd-resource-capabilities`、`mmd-resource-surface`、`mmd-resource-filter-notice`、`mmd-resource-relations` 类名适配品牌样式。Shell、菜单、账号及应用路由仍由宿主实现。

### 内嵌 CRUD（无需业务路由）

与网站 playground 示例一致，`MmdRenderer` / `MmdResourcePage` 未传 `onOpenView` 时，新增、详情、编辑和关联记录使用组件内弹窗。传入 `resources` 后，详情弹窗继续展示关联子表，关联子表的新建默认值、固定查询条件和变更刷新由 MMD 传递。`ReferenceProvider` 只配置 `data` 即可打开关联记录；显式配置 `href/navigate` 时仍使用宿主导航。

默认列表和关联标签状态保留在组件实例内，不改变 URL。只有显式设置 `list.persistQuery: true`（或提供 `queryState/tabState`）才使用 URL 联动。可用 `initialOpenView` 从宿主概览打开一条记录；它只作为初始弹窗，不要求宿主实现路由或弹窗状态。
