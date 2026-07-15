import { describe, expect, test } from "bun:test";

import { frontendCodeFor, serverCodeFor } from "./playground-snippets";

describe("Playground code inspector", () => {
  test("前端代码跟随当前请求", () => {
    const code = frontendCodeFor({
      method: "POST",
      path: "/mmd/actions/duplicate",
      body: { model: "Product", ids: ["product-1"] },
    });

    expect(code).toContain('request("/mmd/actions/duplicate"');
    expect(code).toContain('"product-1"');
  });

  test("服务端代码展示当前通用 CRUD 路由", () => {
    expect(serverCodeFor({ method: "POST", path: "/mmd/meta" })).toContain(
      "engine.getMeta(input)",
    );
    expect(
      serverCodeFor({ method: "POST", path: "/mmd/query-list" }),
    ).toContain("engine.queryList(input)");
    expect(
      serverCodeFor({ method: "POST", path: "/mmd/query-one" }),
    ).toContain("engine.queryOne(input)");
    expect(serverCodeFor({ method: "POST", path: "/mmd/save" })).toContain(
      "engine.save(input)",
    );
    expect(serverCodeFor({ method: "POST", path: "/mmd/remove" })).toContain(
      "engine.remove",
    );
  });

  test("服务端代码展示真实 Action 注册与引擎调用", () => {
    const code = serverCodeFor({
      method: "POST",
      path: "/mmd/actions/publish",
    });

    expect(code).toContain("const actions");
    expect(code).toContain('publish: changeStatus("published")');
    expect(code).toContain("engine.executeAction(input)");
  });
});
