# MMD

[English](./README.md)

MMD 是一套元数据驱动的全栈管理工具。定义一次模型，即可由 `mmd-engine` 执行安全的数据操作，并由 `mmd-renderer` 生成列表、搜索、详情、新建和编辑界面。

当前仓库已包含完整的 Product 示例：Hono API、Neon PostgreSQL、Next.js 静态网站、自定义库存字段、发布/归档/复制操作、中英文界面和在线 API 文档。

## 本地运行

安装 [Bun](https://bun.sh/) 后执行：

```bash
bun install
bun run dev
```

- 网站与 Playground：<http://localhost:3000/playground>
- Demo API：<http://localhost:8787>
- API 文档：<http://localhost:8787/docs>
- OpenAPI：<http://localhost:8787/openapi.json>

未配置 `DATABASE_URL` 时，API 使用内存适配器；配置 Neon PostgreSQL 连接后使用 Prisma + Neon 适配器。

## 部署地址

- 官网：<https://mmd.zyking.xyz>
- API：<https://mmd-api.zyking.xyz>
- API 文档：<https://mmd-api.zyking.xyz/docs>

官网通过 Next.js 静态导出部署到 Cloudflare Workers Static Assets；API 部署到 Cloudflare Workers，数据存储在 Neon。生产会话使用 Cloudflare 来源 IP 的哈希摘要，本地开发支持 Cookie 或 `X-MMD-Session`。

## 三个核心包

```text
mmd-contracts  模型、字段、视图、字典、Action 和请求协议
mmd-engine     元数据注册、查询、写入、过滤、分页和自定义操作
mmd-renderer   React Provider、列表/详情/表单、自定义字段和操作
```

使用任一包管理器安装三个核心包：

```bash
npm install mmd-contracts mmd-engine mmd-renderer
pnpm add mmd-contracts mmd-engine mmd-renderer
yarn add mmd-contracts mmd-engine mmd-renderer
bun add mmd-contracts mmd-engine mmd-renderer
```

三个包的源码和测试均在仓库内。`mmd-contracts`、`mmd-engine`、`mmd-renderer` 在 2026-07-15 查询时均未被 npm 注册；正式发布前需要再次确认名称。

## 前端默认实现

`MmdProvider` 不传配置也可运行：

- API：原生 `fetch` 请求同源 `/api`
- 认证：匿名访问并携带同源 Cookie
- 路由：Hash 路由，适合静态托管
- 错误：超时、网络和 API 错误的统一解析与提示
- 国际化：内置中文和英文，按浏览器语言选择

跨域 API、Token、路由、错误上报和文案都可单独覆盖。详见 [快速开始](./docs/快速开始.md) 和 [扩展开发](./docs/扩展开发.md)。

## 仓库结构

```text
apps/website          Next.js 静态官网、文档和 Playground
apps/demo-api         Hono API、Prisma 与 Neon 数据适配
packages/mmd-contracts
packages/mmd-engine
packages/mmd-renderer
docs                  使用与 API 文档
examples              可复制的前端和后端示例
```

## 验证命令

```bash
bun run test
bun run typecheck
bun run build
```

## 文档

- [快速开始](./docs/快速开始.md)
- [API 参考](./docs/API参考.md)
- [扩展开发](./docs/扩展开发.md)
- [部署说明](./docs/部署说明.md)
- [示例目录](./examples/basic/README.md)
