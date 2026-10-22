import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the production Cloudflare build served by
 * workerd (wrangler dev), backed by the local Supabase stack (`npx supabase start`).
 * `bun run gate` builds first, so the server here only serves .output.
 */
const PORT = Number(process.env.E2E_PORT ?? 8787);

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
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `bunx wrangler dev -c .output/server/wrangler.json --port ${PORT} --ip 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
