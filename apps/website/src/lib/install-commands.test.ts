import { describe, expect, it } from "bun:test";

import { installCode, installCommands } from "./install-commands";

describe("核心包安装命令", () => {
  it("按 npm、pnpm、yarn、bun 排列", () => {
    expect(installCommands).toEqual([
      "npm install mmd-contracts@beta mmd-engine@beta mmd-renderer@beta",
      "pnpm add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta",
      "yarn add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta",
      "bun add mmd-contracts@beta mmd-engine@beta mmd-renderer@beta",
    ]);
    expect(installCode).toBe(installCommands.join("\n"));
  });

  it("README 与快速开始保持相同顺序", async () => {
    const documents = await Promise.all([
      Bun.file(new URL("../../../../README.md", import.meta.url)).text(),
      Bun.file(new URL("../../../../README.zh-CN.md", import.meta.url)).text(),
      Bun.file(new URL("../../../../docs/快速开始.md", import.meta.url)).text(),
    ]);

    for (const document of documents) {
      let previous = -1;
      for (const command of installCommands) {
        const current = document.indexOf(command);
        expect(current).toBeGreaterThan(previous);
        previous = current;
      }
    }
  });
});
