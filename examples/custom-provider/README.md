# Provider 配置示例 / Provider configuration

`MmdProvider` 自带 API、匿名认证、Hash 路由、错误反馈和中英文消息。不传配置即可使用同源 `/api`，也可以逐项覆盖。

## 代码

- [默认配置.tsx](./默认配置.tsx)：零配置运行。
- [自定义配置.tsx](./自定义配置.tsx)：API、认证、路由、错误和国际化完整覆盖。
- [配置解析实现](../../packages/mmd-renderer/src/config.ts)
- [请求与认证实现](../../packages/mmd-renderer/src/transport.ts)
- [中英文实现](../../packages/mmd-renderer/src/i18n.ts)

生产网站通过 `NEXT_PUBLIC_MMD_API_URL` 设置 API 地址，未设置时生产构建使用 `https://mmd-api.zyking.xyz/api`。
