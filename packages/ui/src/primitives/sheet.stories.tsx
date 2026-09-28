import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen } from "storybook/test";
import { Button } from "./button";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";

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
