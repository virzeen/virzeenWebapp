import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RefreshCw } from "lucide-react";
import { expect } from "storybook/test";
import { Button } from "./button";
import { FloatingInput } from "./floating-input";

const meta = {
  title: "Primitives/FloatingInput",
  component: FloatingInput,
  tags: ["autodocs"],
  args: { label: "Email", type: "email", inputMode: "email", autoComplete: "email", required: true },
  decorators: [
    (Story) => (
      <div className="max-w-sm pt-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FloatingInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The label sits inside the 56px box; typing moves it onto the top line. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText(/Email/);
    await userEvent.type(field, "asha@example.com");
    await expect(field).toHaveValue("asha@example.com");
  },
};
export const Filled: Story = { args: { defaultValue: "asha@example.com" } };
export const WithError: Story = {
  args: { defaultValue: "asha@", error: "Enter a valid email address" },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText(/Email/)).toHaveAccessibleDescription("Enter a valid email address");
    await expect(canvas.getByLabelText(/Email/)).toBeInvalid();
  },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: "asha@example.com" } };

/** The sign-in code while the resend countdown runs: the seconds at the end, inside the box. */
export const WithCountdown: Story = {
  args: {
    label: "6-digit code",
    type: "text",
    inputMode: "numeric",
    autoComplete: "one-time-code",
    endAdornment: <span className="px-2 text-small tabular-nums">9s</span>,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("9s")).toBeVisible();
  },
};

/** When the countdown ends: a small icon button (always with an `aria-label`) in place of the seconds. */
export const WithResendIcon: Story = {
  args: {
    label: "6-digit code",
    type: "text",
    inputMode: "numeric",
    autoComplete: "one-time-code",
    endAdornment: (
      <Button variant="ghost" size="icon" shape="pill" aria-label="Resend code">
        <RefreshCw className="size-5" strokeWidth={1.5} aria-hidden />
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Resend code" })).toBeVisible();
  },
};
