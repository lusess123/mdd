# MMD

[English](./README.md)

MMD 是一套元数据驱动的全栈管理工具。定义一次模型，即可由 `mmd-engine` 执行安全的数据操作，并由 `mmd-renderer` 生成列表、搜索、详情、新建和编辑界面。

当前仓库已包含完整的 Product 示例：Hono API、通过 Cloudflare Hyperdrive 访问的 Neon PostgreSQL、Next.js 静态网站、自定义库存字段、发布/归档/复制操作、中英文界面和在线 API 文档。

## 本地运行

安装 [Bun](https://bun.sh/) 后执行：

```bash
bun install
export DATABASE_URL='postgresql://...'
bun --cwd=apps/demo-api run db:migrate
bun run dev
```

- 网站与 Playground：<http://localhost:3000/playground>
- Demo API：<http://localhost:8787>
- API 文档：<http://localhost:8787/docs>
- OpenAPI：<http://localhost:8787/openapi.json>

本地 Bun 开发必须配置 `DATABASE_URL`。可运行的 API 不会回退到内存数据；内存适配器仅保留为适配器示例和测试夹具。连接字符串不得提交到仓库。

## 部署地址

- 官网：<https://mmd.zyking.xyz>
- API：<https://mmd-api.zyking.xyz>
- API 文档：<https://mmd-api.zyking.xyz/docs>

官网通过 Next.js 静态导出部署到 Cloudflare Workers Static Assets；API 通过 `PrismaPg` 和 `HYPERDRIVE` 绑定访问 Neon。`DATABASE_URL` 只用于数据库迁移和显式 Hyperdrive 配置。生产会话使用 Cloudflare 来源 IP 的哈希摘要，本地开发支持 Cookie 或 `X-MMD-Session`。

## 三个核心包

```text
mmd-contracts  模型、字段、视图、字典、Action 和请求协议
mmd-engine     元数据注册、查询、写入、过滤、分页和自定义操作
mmd-renderer   React Provider、列表/详情/表单、自定义字段和操作
```

使用任一包管理器安装三个核心包：

```bash
npm install mmd-contracts@beta mmd-engine@beta mmd-renderer@beta
pnpm add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta
yarn add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta
bun add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta
```

首版已准备为 `0.1.0-beta.1`，使用 `beta` 标签；发布工作流成功后，上述命令才可安装。详见 [npm 发布说明](./docs/npm发布.md)。

## 前端默认实现

`MmdProvider` 不传配置也可运行：

- API：原生 `fetch` 请求同源 `/api`
- 认证：匿名访问并携带同源 Cookie
- 路由：Hash 路由，适合静态托管
- 错误：超时、网络和 API 错误的统一解析与提示
- 国际化：内置中文和英文，按浏览器语言选择

跨域 API、Token、路由、错误上报和文案都可单独覆盖。详见 [快速开始](./docs/快速开始.md) 和 [扩展开发](./docs/扩展开发.md)。

官网和管理组件覆盖常见桌面、平板和手机尺寸。移动端使用底部导航，表格、操作按钮和弹窗不得被裁切或无法操作。

## 仓库结构

```text
apps/website          Next.js 静态官网、文档和 Playground
apps/demo-api         Hono API、PrismaPg、Hyperdrive 与 Neon
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
