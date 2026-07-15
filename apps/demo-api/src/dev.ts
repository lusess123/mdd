import { createApp } from "./app";

const port = Number(Bun.env.PORT ?? 8787);
if (!Bun.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const app = createApp({
  corsOrigin: Bun.env.CORS_ORIGIN ?? "http://localhost:3000",
  databaseUrl: Bun.env.DATABASE_URL
});

Bun.serve({ port, fetch: app.fetch });

console.log(`MMD Demo API is running at http://localhost:${port}`);
