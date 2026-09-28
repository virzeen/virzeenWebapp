// packages/ui/src/primitives/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShoppingBag } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"], // generates docs the Storybook MCP can read
  args: { children: "Add to bag" },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost", "destructive", "link"] },
    size: { control: "select", options: ["sm", "md", "lg", "icon"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Remove" } };
export const Loading: Story = { args: { loading: true, children: "Placing order" } };
export const Disabled: Story = { args: { disabled: true, children: "Out of stock" } };
export const IconOnly: Story = {
  args: {
    size: "icon",
    variant: "ghost",
    "aria-label": "Open bag",
    children: <ShoppingBag className="size-5" />,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="gap-4 flex flex-wrap items-center">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

export const Mobile: Story = {
  args: { className: "w-full", size: "lg" },
  globals: { viewport: { value: "mobile1" } },
};
