import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ButtonLink, Link } from "./link";

const meta = {
  title: "Primitives/Link",
  component: Link,
  tags: ["autodocs"],
  args: { href: "/shop", children: "Browse the collection" },
  argTypes: { variant: { control: "select", options: ["default", "subtle", "nav"] } },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Subtle: Story = { args: { variant: "subtle", children: "Returns policy" } };
export const Nav: Story = {
  render: () => (
    <nav aria-label="Example" className="flex gap-6">
      <Link variant="nav" href="/shop" aria-current="page">
        Shop
      </Link>
      <Link variant="nav" href="/portfolio">
        Portfolio
      </Link>
      <Link variant="nav" href="/about">
        About
      </Link>
    </nav>
  ),
};

export const AsButton: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ButtonLink href="/shop" shape="pill" size="lg">
        Shop the collection
      </ButtonLink>
      <ButtonLink href="/portfolio" variant="secondary" shape="pill" size="lg">
        View the lookbook
      </ButtonLink>
    </div>
  ),
};
