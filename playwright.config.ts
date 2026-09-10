import { defineConfig } from "@playwright/test";
const remote = process.env.MMD_TEST_BASE_URL;
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: remote ?? "http://127.0.0.1:3040",
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...(process.env.CI ? {} : { channel: "chrome" }),
  },
  reporter: "list",
  outputDir: "test-results",
  ...(remote
    ? {}
    : {
        webServer: {
          command: "bun scripts/serve-website.ts",
          url: "http://127.0.0.1:3040",
          timeout: 30000,
        },
      }),
});
