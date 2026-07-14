import { describe, expect, test } from "bun:test";

import { frontendCodeFor, serverCodeFor } from "./playground-snippets";

describe("Playground code inspector", () => {
  test("前端代码跟随当前请求", () => {
    const code = frontendCodeFor({
      method: "POST",
      path: "/actions/duplicate",
      body: { ids: ["product-1"] },
    });

    expect(code).toContain('request("/actions/duplicate"');
    expect(code).toContain('"product-1"');
  });

  test("服务端代码展示当前 CRUD 处理逻辑", () => {
    expect(serverCodeFor({ method: "GET", path: "/products" })).toContain(
      "products.list(input.data)",
    );
    expect(serverCodeFor({ method: "POST", path: "/products" })).toContain(
      "CreateProductSchema.safeParse",
    );
    expect(
      serverCodeFor({ method: "PATCH", path: "/products/product-1" }),
    ).toContain("UpdateProductSchema.safeParse");
    expect(
      serverCodeFor({ method: "DELETE", path: "/products/product-1" }),
    ).toContain("products.delete");
  });

  test("服务端代码展示真实 Action 注册表", () => {
    const code = serverCodeFor({
      method: "POST",
      path: "/actions/publish",
    });

    expect(code).toContain("const actionHandlers");
    expect(code).toContain('products.setStatus("publish"');
    expect(code).toContain("handler(input.data.ids)");
  });
});
