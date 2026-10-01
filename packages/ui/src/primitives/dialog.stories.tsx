import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor, within } from "storybook/test";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "./dialog";

const meta = {
  title: "Primitives/Dialog",
  component: DialogContent,
  tags: ["autodocs"],
  args: { title: "Cancel this order?" },
} satisfies Meta<typeof DialogContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Confirmation: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Cancel order</Button>
      </DialogTrigger>
      <DialogContent
        title="Cancel this order?"
        description="The items go back into stock. This can't be undone."
      >
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep order</Button>
          </DialogClose>
          <Button variant="destructive">Cancel order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Cancel order" }));
    const dialog = await screen.findByRole("dialog", { name: "Cancel this order?" });
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.keyboard("{Escape}");
    // Focus returns to the trigger once the close animation finishes.
    await waitFor(() => expect(canvas.getByRole("button", { name: "Cancel order" })).toHaveFocus());
  },
};

export const OpenByDefault: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent title="Remove item?" description="You can add it back any time.">
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep</Button>
          </DialogClose>
          <Button>Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/**
 * `size="lg"`: a longer popup. The body scrolls; the title and Done stay in view. Focus starts on the body, so arrow
 * keys and Page Down scroll it even with nothing to focus inside.
 */
export const Large: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Edit Mountain print</Button>
      </DialogTrigger>
      <DialogContent
        size="lg"
        title="Mountain print"
        description="Its photos, price and stock. Save the product to show changes in the shop."
        footer={
          <DialogFooter>
            <DialogClose asChild>
              <Button>Done</Button>
            </DialogClose>
          </DialogFooter>
        }
      >
        <ul className="flex flex-col gap-4">
          {["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "Free size"].map((size) => (
            <li key={size} className="flex h-16 items-center rounded-md border border-line px-4 text-body">
              Mountain print, {size}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit Mountain print" }));
    const dialog = await screen.findByRole("dialog", { name: "Mountain print" });
    await waitFor(() => expect(dialog).toBeVisible());
    // The scrolling body is a named, focusable region where focus starts; Tab and Shift+Tab reach it again.
    const body = within(dialog).getByRole("region", { name: "Mountain print" });
    await expect(body).toHaveAttribute("tabindex", "0");
    await waitFor(() => expect(body).toHaveFocus());
    await expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    await userEvent.tab();
    await expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(body).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit Mountain print" })).toHaveFocus());
  },
};

/**
 * `size="lg"` with `media`: the product page's "View product details". The header shows the photo, the name and,
 * in the app, the price as the description.
 */
export const LargeWithMedia: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="underline">View product details</Button>
      </DialogTrigger>
      <DialogContent
        size="lg"
        title="Linen Overshirt"
        description="Colour shown: Black"
        media={<span className="block aspect-4/5 bg-ink-muted" />}
      >
        <div className="flex flex-col gap-6 text-body">
          <p>A relaxed overshirt in washed linen with a boxy fit, patch pockets and horn-effect buttons.</p>
          <section className="flex flex-col gap-2">
            <h3 className="text-h3">Product details</h3>
            <ul className="list-disc pl-6">
              <li>100% linen</li>
              <li>Colour shown: Black</li>
              <li>Country/Region of origin: Nepal</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "View product details" }));
    const dialog = await screen.findByRole("dialog", { name: "Linen Overshirt" });
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(dialog).toHaveAccessibleDescription("Colour shown: Black");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "View product details" })).toHaveFocus());
  },
};

/**
 * `size="split"`: the Favourites "Add to bag" popup, like Nike's quick add. From `lg` the photo fills the left half
 * (with its own previous/next buttons in the app); below `lg` it's hidden and `media` sits beside the title. The
 * footer holds a link on the left and the main button on the right.
 */
export const Split: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" shape="pill">
          Add to bag
        </Button>
      </DialogTrigger>
      <DialogContent
        size="split"
        title="Linen Overshirt"
        description="Tops · Bone"
        aside={<span className="absolute inset-0 bg-ink-muted" />}
        media={<span className="block aspect-square bg-ink-muted" />}
        footer={
          <div className="flex items-center justify-between gap-4">
            <Button variant="underline">View full product</Button>
            <Button size="lg" shape="pill">
              Add to bag
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <p className="text-body font-medium">Select size</p>
          <div className="grid grid-cols-5 gap-2">
            {["XS", "S", "M", "L", "XL"].map((size) => (
              <span
                key={size}
                className="flex h-11 items-center justify-center rounded-sm border border-line"
              >
                {size}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add to bag" }));
    const dialog = await screen.findByRole("dialog", { name: "Linen Overshirt" });
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(dialog).toHaveAccessibleDescription("Tops · Bone");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.getByRole("button", { name: "Add to bag" })).toHaveFocus());
  },
};
