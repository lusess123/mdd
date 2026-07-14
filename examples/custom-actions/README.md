# 自定义操作示例 / Custom actions

当前 Demo 实现了三个操作：发布 `publish`、归档 `archive` 和复制 `duplicate`。操作同时出现在共享元数据、Hono 后端和 Playground 行操作中。

## 运行

```bash
bun install
bun run dev
```

可以在 Playground 点击操作，也可以直接请求 Hono API：

```bash
curl -X POST http://localhost:8787/api/actions/publish \
  -H 'content-type: application/json' \
  -d '{"ids":["product-1001"]}'
```

## 对应实现

- [操作元数据](../../packages/mmd-contracts/src/index.ts)
- [操作路由与处理函数](../../apps/demo-api/src/app.ts)
- [状态更新与复制逻辑](../../apps/demo-api/src/store.ts)
- [前端操作入口](../../apps/website/src/components/playground-content.tsx)

新增操作时，需要同步补充元数据、后端处理函数和前端入口；仓库尚未把这三处封装为已发布的注册 API。
