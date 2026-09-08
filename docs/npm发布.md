# npm 发布

三个核心包首版为 `0.1.0-beta.1`，发布到 `beta` 标签。当前仅准备好发布流程，是否已发布以 npm Registry 和 Actions 结果为准。

## 准备

在仓库 Secrets 添加 `NPM_TOKEN`：使用有包发布权限、启用 Bypass 2FA 的 npm granular access token。Token 不写入代码或文档。

```bash
bun install --frozen-lockfile
bun run release:check
```

检查会生成 `dist/npm/` 产物，包含编译代码、类型声明、README 和许可证，并在仓库外验证安装、Node 导入和 TypeScript 类型解析。

## 发布

1. 将版本和工作流合入 `main`。
2. 运行 GitHub Actions 的 `Publish MMD npm packages`，勾选 `publish`。不勾选时只验证。
3. 工作流依次发布 contracts、engine、renderer，并验证从 npm 安装。

如果部分包已经发布，重跑时仅跳过内容完全一致的版本；内容不同必须升级版本。三个包版本保持一致，包间依赖使用相同的精确 beta 版本。

发布后安装：

```bash
pnpm add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta
```

`latest` 标签留给后续稳定版。
