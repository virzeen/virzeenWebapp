import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor } from "storybook/test";
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

/** `size="lg"`: the product editor's style popup. The body scrolls; the title and Done stay in view. */
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
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit Mountain print" })).toHaveFocus());
  },
};
