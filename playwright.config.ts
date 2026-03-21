import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs Next on a dedicated port so `reuseExistingServer` never attaches to
 * an unrelated process on :3000 (stale/wrong app → 404 on main-app.js, no hydration).
 * Override: PLAYWRIGHT_PORT=3002 npm run test:e2e
 * Reuse your own dev server (must match PLAYWRIGHT_PORT): PLAYWRIGHT_REUSE_SERVER=1
 */
const E2E_PORT = Number(process.env.PLAYWRIGHT_PORT ?? "3001");
const baseURL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    // `port` waits for TCP accept; `url` alone can hang if `/` is slow or non-200 during first compile.
    command: `npx next dev -p ${E2E_PORT}`,
    port: E2E_PORT,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 180_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
