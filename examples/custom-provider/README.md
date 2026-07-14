# 前端配置示例 / Provider configuration

当前网站使用内部 `MmdProvider` 统一处理 API、认证、路由、错误提示和中英文文案。配置可按需覆盖；不传覆盖项时使用仓库内置默认值。

## 运行

```bash
bun install
bun run dev
```

本地网站把 API 地址注入为 `http://localhost:8787/api`。生产构建默认使用 `https://mmd-api.zyking.xyz/api`，也可以通过 `NEXT_PUBLIC_MMD_API_URL` 覆盖。

## 当前配置入口

```tsx
<MmdProvider
  environment={{ apiBaseUrl: "http://localhost:8787/api" }}
  auth={{ mode: "custom", getToken: () => "demo-token" }}
  router={{ mode: "custom", navigate: (path) => console.log(path) }}
>
  {children}
</MmdProvider>
```

- [Provider 实现](../../apps/website/src/components/mmd-provider.tsx)
- [默认值与覆盖优先级](../../apps/website/src/lib/mmd-config.ts)
- [网站实际注入方式](../../apps/website/src/components/site-providers.tsx)
- [中英文消息与 API 错误映射](../../apps/website/src/lib/i18n.ts)
- [配置测试](../../apps/website/src/lib/mmd-config.test.ts)

该 Provider 当前属于仓库内部实现，尚未作为 npm 包发布。
