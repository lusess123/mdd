import { createApp } from "../../apps/demo-api/src/app";

const app = createApp({
  corsOrigin: "http://localhost:3000",
  databaseUrl: Bun.env.DATABASE_URL,
});

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 8787),
  fetch: app.fetch,
});

console.log(`MMD API: http://localhost:${server.port}`);
