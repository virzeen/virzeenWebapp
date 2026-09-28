import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ["../../apps/web/.env.local", "../../apps/web/.env"], quiet: true });

const testDatabaseUrl = process.env.DATABASE_URL_TEST ?? "";

export default defineConfig({
  resolve: {
    // "server-only" throws outside Next.js (docs/testing/testing-strategy.md §5).
    alias: { "server-only": fileURLToPath(new URL("./test/empty.ts", import.meta.url)) },
  },
  test: {
    env: { DATABASE_URL: testDatabaseUrl, TZ: "UTC" },
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    // Integration tests share one database; run files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
