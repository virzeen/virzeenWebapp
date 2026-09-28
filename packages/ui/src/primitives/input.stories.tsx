import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input, Textarea } from "./input";

const meta = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  args: { "aria-label": "Email", placeholder: "you@example.com", type: "email", autoComplete: "email" },
  argTypes: { variant: { control: "select", options: ["default", "error"] } },
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
export const Multiline: Story = {
  render: () => <Textarea aria-label="Message" placeholder="How can we help?" />,
};
