import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  webServer: [
    {
      command: "WEB_PUBLIC_URL=http://127.0.0.1:3000 ../../.venv/bin/uvicorn vishwavaani_api.main:app --app-dir ../api/src --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/v1/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "corepack pnpm dev --hostname 127.0.0.1",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"], permissions: ["microphone"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], permissions: ["microphone"] } },
  ],
});
