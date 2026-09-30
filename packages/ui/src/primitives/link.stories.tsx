import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CircleHelp, Heart, ShoppingBag } from "lucide-react";
import { expect } from "storybook/test";
import { ButtonLink, Link } from "./link";

const meta = {
  title: "Primitives/Link",
  component: Link,
  tags: ["autodocs"],
  args: { href: "/shop", children: "Browse the collection" },
  argTypes: { variant: { control: "select", options: ["default", "subtle", "nav", "menu", "menuSmall"] } },
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

/** The site header's page links (Inter Tight, light). */
export const Header: Story = {
  render: () => (
    <nav aria-label="Example" className="flex gap-8">
      <Link variant="header" href="/shop" aria-current="page">
        Shop
      </Link>
      <Link variant="header" href="/portfolio">
        Portfolio
      </Link>
      <Link variant="header" href="/about">
        About
      </Link>
    </nav>
  ),
};

/** `header` inside `tone-inverse` (white on a photo, the home page header before scrolling). */
export const HeaderOnPhoto: Story = {
  render: () => (
    <nav aria-label="Example" className="flex gap-8 bg-ink p-6 tone-inverse">
      <Link variant="header" href="/shop">
        Shop
      </Link>
      <Link variant="header" href="/portfolio">
        Portfolio
      </Link>
    </nav>
  ),
};

/**
 * Full-width menu rows, as in the phone menu: `menu` for the main links (56px tall), `menuSmall` beside a 20px icon
 * (44px tall). Pressed and hovered rows turn `ink-muted`.
 */
export const Menu: Story = {
  globals: { viewport: { value: "mobile1" } },
  render: () => (
    <nav aria-label="Example" className="flex flex-col">
      <Link variant="menu" href="/" aria-current="page">
        Home
      </Link>
      <Link variant="menu" href="/portfolio">
        Portfolio
      </Link>
      <Link variant="menu" href="/about">
        About
      </Link>
      <div className="mt-12 flex flex-col">
        <Link variant="menuSmall" href="/favourites">
          <Heart className="size-5" strokeWidth={1.5} aria-hidden />
          Favourites
        </Link>
        <Link variant="menuSmall" href="/cart">
          <ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />
          Bag
        </Link>
        <Link variant="menuSmall" href="/contact">
          <CircleHelp className="size-5" strokeWidth={1.5} aria-hidden />
          Help
        </Link>
      </div>
    </nav>
  ),
  play: async ({ canvas }) => {
    for (const name of ["Home", "Portfolio", "About"]) {
      await expect(canvas.getByRole("link", { name }).getBoundingClientRect().height).toBeGreaterThanOrEqual(
        56,
      );
    }
    for (const name of ["Favourites", "Bag", "Help"]) {
      await expect(canvas.getByRole("link", { name }).getBoundingClientRect().height).toBeGreaterThanOrEqual(
        44,
      );
    }
  },
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
