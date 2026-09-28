import type { Preview } from "@storybook/nextjs-vite";
import "../src/styles.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // Accessibility violations fail component tests (docs/ui/ui-discipline.md §3).
    a11y: { test: "error" },
    nextjs: { appDirectory: true },
  },
};

export default preview;
