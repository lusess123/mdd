# MMD

[中文说明](./README.zh-CN.md)

MMD is a metadata-driven full-stack admin toolkit. Define a model once, let `mmd-engine` execute safe data operations, and let `mmd-renderer` generate list, search, detail, create, and edit experiences.

The repository contains a complete Product demo: a Hono API, Neon PostgreSQL through Cloudflare Hyperdrive, a statically exported Next.js site, a custom inventory field, publish/archive/duplicate actions, Chinese and English UI, and live API documentation.

## Run locally

Install [Bun](https://bun.sh/), then run:

```bash
bun install
export DATABASE_URL='postgresql://...'
bun --cwd=apps/demo-api run db:migrate
bun run dev
```

- Website and Playground: <http://localhost:3000/playground>
- Demo API: <http://localhost:8787>
- API reference: <http://localhost:8787/docs>
- OpenAPI: <http://localhost:8787/openapi.json>

Local Bun development requires `DATABASE_URL`. The runnable API never falls back to in-memory data; the memory adapter is retained only as an adapter example and test fixture. Do not commit the connection string.

## Deployment endpoints

- Website: <https://mmd.zyking.xyz>
- API: <https://mmd-api.zyking.xyz>
- API reference: <https://mmd-api.zyking.xyz/docs>

The statically exported Next.js site is served by Cloudflare Workers Static Assets. The Hono API uses `PrismaPg` and the `HYPERDRIVE` binding to access Neon. `DATABASE_URL` is reserved for migrations and explicit Hyperdrive configuration. Production sessions use a hash of Cloudflare's source IP; local development supports a cookie or `X-MMD-Session`.

## Core packages

```text
mmd-contracts  Models, fields, views, dictionaries, actions, and wire types
mmd-engine     Metadata registry, queries, writes, filters, pagination, actions
mmd-renderer   React Provider, list/detail/forms, custom fields, and actions
```

Install all three packages with your preferred package manager:

```bash
npm install mmd-contracts@beta mmd-engine@beta mmd-renderer@beta
pnpm add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta
yarn add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta
bun add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta
```

All three packages are published on npm as `0.1.0-beta.1`, available under the `beta` tag. See the [publishing guide (Chinese)](./docs/npm发布.md).

## Frontend defaults

`MmdProvider` works without configuration:

- API: native `fetch` against same-origin `/api`
- Authentication: anonymous with same-origin cookies
- Router: hash routing for static hosting
- Errors: unified timeout, network, and API error feedback
- Locale: Chinese and English, selected from the browser language

The API transport, token/headers, router, error callbacks, locale, and messages are independently replaceable. See [Quick start (Chinese)](./docs/快速开始.md) and [Extension guide (Chinese)](./docs/扩展开发.md).

The website and rendered management UI are responsive across common desktop, tablet, and mobile widths. Mobile layouts keep navigation, tables, actions, and dialogs usable without clipping.

## Repository

```text
apps/website          Static Next.js site, docs, and Playground
apps/demo-api         Hono API, PrismaPg, Hyperdrive, and Neon
packages/mmd-contracts
packages/mmd-engine
packages/mmd-renderer
docs                  Usage and API documentation
examples              Copyable frontend and backend examples
```

## Verify

```bash
bun run test
bun run typecheck
bun run build
```

## Documentation

- [Quick start (Chinese)](./docs/快速开始.md)
- [API reference (Chinese)](./docs/API参考.md)
- [Extension guide (Chinese)](./docs/扩展开发.md)
- [Deployment guide (Chinese)](./docs/部署说明.md)
- [Examples](./examples/basic/README.md)
