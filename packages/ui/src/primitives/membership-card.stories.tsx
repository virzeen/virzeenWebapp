import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { MembershipCard } from "./membership-card";

const meta = {
  title: "Primitives/MembershipCard",
  component: MembershipCard,
  tags: ["autodocs"],
  args: {
    name: "Sita Rai",
    title: "MONO Member",
    caption: "Member since Nov 2026",
    logo: (
      <span aria-hidden className="font-display text-h2">
        V
      </span>
    ),
    "aria-label": "MONO Member card",
    role: "group",
  },
} satisfies Meta<typeof MembershipCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A free MONO Member: plain and grey. */
export const Member: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Sita Rai")).toBeVisible();
    await expect(canvas.getByText("Member since Nov 2026")).toBeVisible();
  },
};

/** The Monochrome Pass: black, with a faint sheen and an inner hairline frame. */
export const Pass: Story = {
  args: {
    level: "pass",
    title: "Monochrome Pass",
    caption: "Valid until 12 May 2027",
    "aria-label": "Monochrome Pass card",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Valid until 12 May 2027")).toBeVisible();
  },
};

/** A long name wraps instead of overflowing the card. */
export const LongName: Story = {
  args: {
    level: "pass",
    name: "Anuradha Bhattarai-Shrestha Gurung",
    title: "Monochrome Pass",
    caption: "Valid until 12 May 2027",
  },
};
