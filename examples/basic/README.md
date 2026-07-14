# 基础示例 / Basic demo

这是仓库当前可运行的完整链路：共享 `Product` 模型、Hono CRUD API、Next.js Playground 和请求记录面板。

## 运行

在仓库根目录执行：

```bash
bun install
bun run dev
```

- 网站与 Playground：<http://localhost:3000/playground>
- Demo API：<http://localhost:8787>
- OpenAPI：<http://localhost:8787/openapi.json>

## 对应实现

- [共享模型与类型](../../packages/mmd-contracts/src/index.ts)
- [Hono API 路由](../../apps/demo-api/src/app.ts)
- [内存数据仓库](../../apps/demo-api/src/store.ts)
- [Next.js Playground](../../apps/website/src/components/playground-content.tsx)

当前数据保存在内存中，重启 Demo API 后会恢复为种子数据。
