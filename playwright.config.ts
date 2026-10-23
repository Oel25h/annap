import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Tests talk to the same local Supabase stack as the server under test.
if (existsSync(".env")) process.loadEnvFile(".env");

/**
 * End-to-end tests run against the production Netlify build (dist and the
 * server function in .netlify/functions-internal) served the way Netlify
 * serves it by scripts/serve-netlify.mjs, backed by the local Supabase stack
 * (`npx supabase start`). `bun run gate` builds first, so the server here
 * only serves the build.
 */
const PORT = Number(process.env.E2E_PORT ?? 8888);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "api", testMatch: /\.api\.spec\.ts$/ },
    { name: "mobile", testIgnore: /\.api\.spec\.ts$/, use: { ...devices["Pixel 7"] } },
    {
      name: "desktop",
      testIgnore: /\.api\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `node scripts/serve-netlify.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
