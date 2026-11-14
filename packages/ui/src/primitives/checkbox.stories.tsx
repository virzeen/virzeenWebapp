import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Checkbox, Switch } from "./checkbox";

const meta = {
  title: "Primitives/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  args: { label: "In stock only" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("checkbox", { name: "In stock only" });
    await userEvent.click(box);
    await expect(box).toBeChecked();
  },
};
export const Checked: Story = { args: { defaultChecked: true } };
export const WithDescription: Story = {
  args: { label: "Make this my default address", description: "Used first at checkout" },
};
export const Disabled: Story = { args: { disabled: true } };
/** A picture row, as in the profile's "Choose your picks" list: thumbnail, name, box on the right. */
export const PictureRow: Story = {
  args: {
    label: "VWear",
    boxAtEnd: true,
    media: <span aria-hidden className="size-16 shrink-0 bg-surface" />,
  },
};

export const SwitchSetting: Story = {
  render: () => (
    <div className="max-w-sm">
      <Switch label="Published" description="Visible in the shop" defaultChecked />
    </div>
  ),
};
export const SwitchOff: Story = {
  render: () => (
    <div className="max-w-sm">
      <Switch label="Featured collection" />
    </div>
  ),
};
