import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CoinStack } from "./coin-stack";

const mark = (
  <svg viewBox="0 0 100 82" fill="currentColor" className="h-auto w-full" aria-hidden>
    <path d="M0 0 C20 18 40 45 48 82 L45 38 C44 30 40 24 34 20 Z" />
    <path d="M100 0 C80 18 60 45 52 82 L55 38 C56 30 60 24 66 20 Z" />
  </svg>
);

const meta = {
  title: "Primitives/CoinStack",
  component: CoinStack,
  tags: ["autodocs"],
  args: { mark },
} satisfies Meta<typeof CoinStack>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One coin, swaying slowly. Hover it: it spins, jumps and lands on a pile of coins. */
export const Default: Story = {};

/** `active`: the stack plays and holds (a tap on a phone). */
export const Active: Story = { args: { active: true } };
