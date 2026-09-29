import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShoppingBag } from "lucide-react";
import { expect, fn } from "storybook/test";
import { Button } from "./button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Add to bag", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "inverse", "destructive", "link"],
    },
    size: { control: "select", options: ["sm", "md", "lg", "icon"] },
    shape: { control: "select", options: ["default", "pill"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add to bag" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Remove" } };
export const LinkStyle: Story = { args: { variant: "link", children: "Size guide" } };
/** Secondary actions in a row (Edit, Archive, Filters): 44px tall on phones and tablets, 36px from `lg`. */
export const Small: Story = { args: { variant: "secondary", size: "sm", shape: "pill", children: "Edit" } };
export const Pill: Story = { args: { shape: "pill", size: "lg", children: "Shop the collection" } };
export const Inverse: Story = {
  args: { variant: "inverse", shape: "pill", children: "Explore" },
  decorators: [
    (Story) => (
      <div className="bg-ink p-8">
        <Story />
      </div>
    ),
  ],
};
export const Loading: Story = {
  args: { loading: true, children: "Placing order" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Placing order" });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
  },
};
export const Disabled: Story = { args: { disabled: true, children: "Out of stock" } };
export const IconOnly: Story = {
  args: {
    size: "icon",
    variant: "ghost",
    "aria-label": "Open bag",
    children: <ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
      <Button shape="pill">Pill</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

export const Mobile: Story = {
  args: { className: "w-full", size: "lg" },
  globals: { viewport: { value: "mobile1" } },
};

/** On a phone the small and text-style buttons still give a 44px-tall touch target. */
export const SmallAndLinkMobile: Story = {
  globals: { viewport: { value: "mobile1" } },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="secondary" size="sm" shape="pill">
        Edit
      </Button>
      <Button variant="ghost" size="sm" shape="pill">
        Archive
      </Button>
      <Button variant="link" size="sm">
        Remove
      </Button>
      <Button variant="link">Continue shopping</Button>
    </div>
  ),
  play: async ({ canvas }) => {
    for (const name of ["Edit", "Archive", "Remove", "Continue shopping"]) {
      const height = canvas.getByRole("button", { name }).getBoundingClientRect().height;
      await expect(height).toBeGreaterThanOrEqual(44);
    }
  },
};
