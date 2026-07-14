# MMD

[中文说明](./README.zh-CN.md)

MMD is a metadata-driven toolkit for building full-stack admin experiences. Define a model once, then use the shared contract to power a Hono API and a React interface with built-in CRUD, custom fields, custom actions, routing, authentication, and error handling.

This repository currently contains the first runnable vertical slice:

- A statically exported Next.js website, documentation, examples, and Playground.
- A Bun-powered Hono demo API that is ready to move to Cloudflare Workers.
- Shared TypeScript contracts used by both applications.
- Chinese and English UI with overridable messages.

## Run locally

Install [Bun](https://bun.sh/), then run:

```bash
bun install
bun dev
```

- Website: <http://localhost:3000>
- Demo API: <http://localhost:8787>
- OpenAPI: <http://localhost:8787/openapi.json>

Planned Cloudflare domains:

- Website: <https://mmd.zyking.xyz>
- API: <https://mmd-api.zyking.xyz>

## Commands

```bash
bun dev        # Start the website and API
bun test       # Run workspace tests
bun typecheck  # Check TypeScript
bun run build  # Produce the static website
```

## Repository

```text
apps/website          Next.js static website and Playground
apps/demo-api         Hono API for Bun and Cloudflare Workers
packages/mmd-contracts
```

The local demo uses an in-memory data adapter and resets when the API restarts. A database adapter will replace it when the Cloudflare database is connected.

## Frontend defaults

The frontend works without configuration and can be overridden incrementally:

- API: native `fetch` against `/api`
- Authentication: anonymous, with same-origin cookies
- Routing: hash routing for static hosting
- Errors: built-in timeout, parsing, and feedback
- Locale: browser language, with Chinese and English built in
