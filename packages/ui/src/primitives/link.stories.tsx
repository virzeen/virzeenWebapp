import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChevronRight, CircleHelp, Heart, House, ShoppingBag, UserRound } from "lucide-react";
import { expect } from "storybook/test";
import { ButtonLink, Link } from "./link";

const meta = {
  title: "Primitives/Link",
  component: Link,
  tags: ["autodocs"],
  args: { href: "/shop", children: "Browse the collection" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "subtle", "nav", "header", "tab", "menu", "menuSmall", "list"],
    },
  },
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

/** The site header's links, like Nike's: 16px medium, the current page (`aria-current`) not marked on screen. */
export const Header: Story = {
  render: () => (
    <nav aria-label="Example" className="flex gap-6">
      <Link variant="header" href="/shop" aria-current="page">
        New and Featured
      </Link>
      <Link variant="header" href="/collections/sale">
        Sale
      </Link>
      <Link variant="header" href="/shop/vwear">
        VWear
      </Link>
    </nav>
  ),
};

/** Tabs of pages, like Nike's member pages: the current page (`aria-current`) is grey, the others ink. */
export const Tab: Story = {
  render: () => (
    <nav aria-label="Example" className="flex gap-6">
      <Link variant="tab" href="/account" aria-current="page">
        Profile
      </Link>
      <Link variant="tab" href="/account/orders">
        Orders
      </Link>
      <Link variant="tab" href="/favourites">
        Favourites
      </Link>
      <Link variant="tab" href="/account/settings">
        Settings
      </Link>
    </nav>
  ),
};

/** `header` inside `tone-inverse` (white on a photo, the home page header before scrolling). */
export const HeaderOnPhoto: Story = {
  render: () => (
    <nav aria-label="Example" className="flex gap-6 bg-ink p-6 tone-inverse">
      <Link variant="header" href="/shop">
        New and Featured
      </Link>
      <Link variant="header" href="/shop/vwear">
        VWear
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

/** A list of pages, like Nike's Settings on phones: icon, label, chevron, a line under each row. */
export const List: Story = {
  render: () => (
    <nav aria-label="Settings" className="max-w-sm">
      <ul className="border-t border-line">
        {[
          ["/account/settings/details", "Account details", UserRound],
          ["/account/addresses", "Delivery addresses", House],
        ].map(([href, label, Icon]) => {
          const RowIcon = Icon as typeof UserRound;
          return (
            <li key={href as string}>
              <Link variant="list" href={href as string}>
                <RowIcon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
                {label as string}
                <ChevronRight className="ml-auto size-5 shrink-0" strokeWidth={1.5} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  ),
  play: async ({ canvas }) => {
    const row = canvas.getByRole("link", { name: "Account details" });
    await expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(56);
  },
};
