import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Runs every story as a component test in a real browser, including the a11y checks.
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [storybookTest({ configDir: ".storybook" })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            // Windows can reserve Vitest's port (63315) after a restart (`netsh interface ipv4 show
            // excludedportrange protocol=tcp`): set VITEST_BROWSER_PORT to use another one.
            ...(process.env.VITEST_BROWSER_PORT
              ? { api: { port: Number(process.env.VITEST_BROWSER_PORT) } }
              : {}),
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});
