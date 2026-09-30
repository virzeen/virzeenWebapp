import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { X } from "lucide-react";
import { expect, screen, waitFor, within } from "storybook/test";
import { Button } from "./button";
import { Link } from "./link";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./sheet";

const meta = {
  title: "Primitives/Sheet",
  component: SheetContent,
  tags: ["autodocs"],
  args: { title: "Bag" },
  argTypes: { side: { control: "select", options: ["right", "bottom"] } },
} satisfies Meta<typeof SheetContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Open bag</Button>
      </SheetTrigger>
      <SheetContent
        title="Bag"
        footer={
          <Button size="lg" className="w-full">
            Checkout
          </Button>
        }
      >
        <p className="text-body text-ink-muted">Cart lines appear here.</p>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open bag" }));
    await expect(await screen.findByRole("dialog", { name: "Bag" })).toBeVisible();
  },
};

export const Bottom: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Filters</Button>
      </SheetTrigger>
      <SheetContent side="bottom" title="Filters" description="Narrow the collection">
        <p className="text-body text-ink-muted">Filter controls appear here.</p>
      </SheetContent>
    </Sheet>
  ),
};

/** `side="top"` with `header`: the phone menu, the whole screen, dropping down from the top (apple.com). */
export const Top: Story = {
  globals: { viewport: { value: "mobile1" } },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Open menu</Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        title="Menu"
        header={
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              shape="pill"
              aria-label="Close menu"
              className="-mr-2 ml-auto"
            >
              <X className="size-6" strokeWidth={1.5} aria-hidden />
            </Button>
          </SheetClose>
        }
      >
        <nav aria-label="Example" className="flex flex-col">
          <Link variant="menu" href="/">
            Home
          </Link>
          <Link variant="menu" href="/shop">
            Shop
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Open menu" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Menu" });
    await waitFor(() => expect(dialog).toBeVisible());
    // The whole screen: as wide as the window.
    await expect(dialog.getBoundingClientRect().width).toBe(window.innerWidth);
    await userEvent.click(within(dialog).getByRole("button", { name: "Close menu" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Menu" })).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/**
 * `header`: your own top row instead of the title bar (the phone menu). The title isn't shown but still names the
 * dialog; the X is a `SheetClose` with its own `aria-label`.
 */
export const CustomHeader: Story = {
  globals: { viewport: { value: "mobile1" } },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Open menu</Button>
      </SheetTrigger>
      <SheetContent
        title="Menu"
        header={
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              shape="pill"
              aria-label="Close menu"
              className="-mr-2 ml-auto"
            >
              <X className="size-6" strokeWidth={1.5} aria-hidden />
            </Button>
          </SheetClose>
        }
      >
        <nav aria-label="Example" className="flex flex-col">
          <Link variant="menu" href="/">
            Home
          </Link>
          <Link variant="menu" href="/portfolio">
            Portfolio
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Open menu" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Menu" });
    await waitFor(() => expect(dialog).toBeVisible());
    // No title bar: the title is only for screen readers, and the default "Close" button is gone.
    await expect(within(dialog).getByRole("heading", { name: "Menu" })).toHaveClass("sr-only");
    await expect(within(dialog).queryByRole("button", { name: "Close" })).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "Close menu" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Menu" })).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
