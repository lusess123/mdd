# npm 发布

正式版使用 `latest` 标签，预发布版使用 `beta` 标签，由包版本自动选择。

## 准备

在仓库 Secrets 添加 `NPM_TOKEN`：使用有包发布权限、启用 Bypass 2FA 的 npm granular access token。Token 不写入代码或文档。

```bash
bun install --frozen-lockfile
bun run release:check
```

检查会生成 `dist/npm/` 产物，包含编译代码、类型声明、README 和许可证，并在仓库外验证安装、Node 导入和 TypeScript 类型解析。

## 发布

1. 将版本和工作流合入 `main`。
2. `main` 推送自动触发 `Deploy MMD Production`：校验 → npm 打包与浏览器验收 → 按 contracts、engine、renderer 顺序发布 → 从公共 npm 安装验证 → API 和网站部署 → 线上浏览器验收 → GitHub Release。npm 未发布成功时不会部署宣称该版本可用的网站。
3. 需要重试时运行 `Deploy MMD Production` 的 `deploy`。也可单独运行 `Publish MMD npm packages` 并勾选 `publish`，随后仍需部署工作流完成官网同步；不勾选只验证。

如果部分包已经发布，重跑时仅跳过内容完全一致的版本；内容不同必须升级版本。三个包版本保持一致，包间依赖使用相同的精确版本。

安装正式版：

```bash
npm install mmd-contracts mmd-engine mmd-renderer
```

需要预发布版时，为包名加上 `@beta`。

## 每个版本的完成条件

1. 三个核心包和内部精确依赖使用同一版本；已发布内容不可覆盖，源码或包 README 改动必须升级版本。
2. `CHANGELOG.md` 说明新增、修复、兼容性；`apps/website/src/lib/releases.ts` 添加中英文功能条目，每条有文档和可操作 demo 链接。历史入口保留，并指向当前兼容示例。
3. 更新在线文档、对应 `docs/`、包 README 及 `examples/` 接入步骤。优先链接正在运行的示例源码，避免另维护一份逐渐失效的复制品。
4. 在 `tests/browser/release.spec.ts` 为新能力编写真实操作断言，测试名称带 `feature:<条目 id>`。`release:check` 检查版本、changelog、文档锚点、demo 页面和测试声明；发布 CI 必须实际运行浏览器测试。
5. `bun run test`、`typecheck`、`build`、`test:browser`、`release:check` 全部通过。浏览器在构建产物和线上各运行一次；GitHub Release 仅在部署验收成功后生成。

新内嵌 Demo 使用真实 Engine 和 Renderer、页面独立的内存数据，可重复验收且不会写公共数据库。Product Playground 继续展示真实 HTTP 和 Neon 链路。版本条目有入口、示例可操作和验证通过，才算交付完成。
