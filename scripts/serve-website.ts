import { resolve, sep } from "node:path";
const root = resolve(import.meta.dir, "../apps/website/out");
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 3040,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const path = resolve(root, `.${pathname}`);
    if (path !== root && !path.startsWith(root + sep))
      return new Response("Not found", { status: 404 });
    const file = Bun.file(
      pathname.endsWith("/") ? resolve(path, "index.html") : path,
    );
    if (await file.exists()) return new Response(file);
    const html = Bun.file(resolve(path, "index.html"));
    if (await html.exists()) return new Response(html);
    return new Response(Bun.file(resolve(root, "404.html")), { status: 404 });
  },
});
console.log(`Static demo: ${server.url}`);
