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
