import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for web helpers only. Playwright journeys live in tests/e2e and run with `pnpm test:e2e`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("../../packages/core/test/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    env: { TZ: "UTC" },
  },
});
