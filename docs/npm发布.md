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
2. 运行 GitHub Actions 的 `Publish MMD npm packages`，勾选 `publish`。不勾选时只验证。
3. 工作流依次发布 contracts、engine、renderer，并验证从 npm 安装。

如果部分包已经发布，重跑时仅跳过内容完全一致的版本；内容不同必须升级版本。三个包版本保持一致，包间依赖使用相同的精确版本。

安装正式版：

```bash
npm install mmd-contracts mmd-engine mmd-renderer
```

需要预发布版时，为包名加上 `@beta`。
