# MMD

[English](./README.md)

MMD 是一套元数据驱动的全栈管理工具。开发者定义一次模型，即可通过同一份协议驱动 Hono API 和 React 界面，并获得 CRUD、自定义字段、自定义操作、路由、认证和错误处理能力。

仓库当前提供第一条可运行的完整链路：

- 可静态导出的 Next.js 官网、文档、示例和 Playground。
- 使用 Bun 运行、可继续部署到 Cloudflare Workers 的 Hono Demo API。
- 前后端共用的 TypeScript 协议。
- 内置中文和英文，并允许覆盖文案。

## 本地运行

安装 [Bun](https://bun.sh/) 后执行：

```bash
bun install
bun dev
```

- 官网：<http://localhost:3000>
- Demo API：<http://localhost:8787>
- OpenAPI：<http://localhost:8787/openapi.json>

Cloudflare 目标域名：

- 官网：<https://mmd.zyking.xyz>
- API：<https://mmd-api.zyking.xyz>

## 常用命令

```bash
bun dev        # 同时启动官网和 API
bun test       # 运行所有测试
bun typecheck  # 检查 TypeScript
bun run build  # 生成静态网站
```

## 仓库结构

```text
apps/website          Next.js 静态官网和 Playground
apps/demo-api         Bun 与 Cloudflare Workers 共用的 Hono API
packages/mmd-contracts
```

本地 Demo 暂时使用内存数据，API 重启后自动恢复。接入 Cloudflare 数据库时只需替换数据适配器。

## 前端默认实现

前端不传配置也能运行，并允许按需覆盖：

- API：使用原生 `fetch` 请求 `/api`
- 认证：匿名访问，携带同源 Cookie
- 路由：适合静态部署的 Hash 路由
- 错误：内置超时、解析和反馈
- 语言：按浏览器语言选择，内置中文和英文
