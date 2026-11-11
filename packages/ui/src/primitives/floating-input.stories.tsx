import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
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
