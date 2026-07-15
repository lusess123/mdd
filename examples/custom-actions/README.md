# 自定义操作示例 / Custom actions

Demo 实现三个真实操作：

- `publish`：把草稿改为已发布，仅草稿行显示。
- `archive`：归档记录，执行前确认。
- `duplicate`：复制记录并生成不重复的 SKU，新记录回到草稿状态。

## 代码

- [模型按钮.ts](./模型按钮.ts)：行按钮和显示条件。
- [后端操作.ts](./后端操作.ts)：`mmd-engine` Action 处理器。
- [前端操作.tsx](./前端操作.tsx)：覆盖前端执行行为。
- [Hono Action API](../../apps/demo-api/src/app.ts)：通用 HTTP 入口。

模型中的 `name`、服务端 `actions` 注册名和 API 路径中的 Action 名必须一致。默认前端处理器会自动请求 API 并刷新列表；只有需要额外交互时才覆盖前端处理器。

## 直接调用

```bash
curl -X POST http://localhost:8787/api/mmd/actions/publish \
  -H 'content-type: application/json' \
  -H 'x-mmd-session: example-session-01' \
  -d '{"model":"Product","ids":["PRODUCT_ID"]}'
```
