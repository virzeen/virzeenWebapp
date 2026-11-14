import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { PremiumPanel } from "./premium-panel";

const meta = {
  title: "Primitives/PremiumPanel",
  component: PremiumPanel,
  tags: ["autodocs"],
  args: { "aria-labelledby": "premium-title" },
} satisfies Meta<typeof PremiumPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Black, with a glowing border and a sweep of light (off with reduced motion). */
export const Default: Story = {
  render: (args) => (
    <PremiumPanel {...args}>
      <h2 id="premium-title" className="font-display text-h2">
        Monochrome Pass
      </h2>
      <p className="text-small text-canvas/70">The full experience.</p>
    </PremiumPanel>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Monochrome Pass" })).toBeVisible();
  },
};

/** With a brand mark as a faint watermark behind the content. */
export const WithWatermark: Story = {
  render: (args) => (
    <PremiumPanel
      {...args}
      watermark={
        <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden>
          <path d="M0 0 L50 100 L100 0 L50 40 Z" />
        </svg>
      }
    >
      <h2 id="premium-title" className="font-display text-h2">
        Monochrome Pass
      </h2>
    </PremiumPanel>
  ),
};
