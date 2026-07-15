# 基础前后端示例 / Basic full-stack example

这个例子使用仓库内的真实实现完成最小闭环：

```text
MmdRenderer → Hono MMD API → mmd-engine → MmdDataAdapter
```

## 运行

```bash
bun install
bun run dev
```

- Playground：<http://localhost:3000/playground>
- API 文档：<http://localhost:8787/docs>

## 示例代码

- [前端.tsx](./前端.tsx)：使用 `MmdProvider` 和 `MmdRenderer` 生成 Product 管理页。
- [后端.ts](./后端.ts)：用 Bun 启动真实 Hono Demo API。
- [通用接口请求.ts](./通用接口请求.ts)：不使用 UI，直接调用 MMD HTTP 协议。

## 实现位置

- [Product 模型](../../packages/mmd-contracts/src/demo.ts)
- [服务端引擎注册](../../apps/demo-api/src/product-engine.ts)
- [Hono 路由](../../apps/demo-api/src/app.ts)
- [Prisma + Neon Adapter](../../apps/demo-api/src/prisma-adapter.ts)
- [真实 Playground](../../apps/website/src/components/playground-content.tsx)

未设置 `DATABASE_URL` 时使用内存 Adapter；线上和配置了数据库的本地环境使用 Neon。Neon 模式按 Cookie 或 `X-MMD-Session` 隔离数据。

全部示例可统一做类型检查：

```bash
bun run build:packages
bunx tsc -p examples/tsconfig.json --noEmit
```
