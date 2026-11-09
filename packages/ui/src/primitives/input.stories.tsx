import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Search } from "lucide-react";
import { expect } from "storybook/test";
import { Input, Textarea } from "./input";

const meta = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  args: { "aria-label": "Email", placeholder: "you@example.com", type: "email", autoComplete: "email" },
  argTypes: { variant: { control: "select", options: ["default", "error", "pill"] } },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: "asha@example.com" } };
export const Error: Story = { args: { variant: "error", defaultValue: "asha@", "aria-invalid": true } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "asha@example.com" } };
/** The header search box: a rounded grey box with a magnifier at the start. */
export const PillWithIcon: Story = {
  args: {
    variant: "pill",
    type: "search",
    "aria-label": "Search products",
    placeholder: "Search",
    autoComplete: "off",
    startIcon: <Search className="size-5" strokeWidth={1.5} />,
  },
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("searchbox", { name: "Search products" });
    await userEvent.type(box, "linen");
    await expect(box).toHaveValue("linen");
  },
};
export const Multiline: Story = {
  render: () => <Textarea aria-label="Message" placeholder="How can we help?" />,
};
