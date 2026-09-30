import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CircleCheck } from "lucide-react";
import { expect, screen, waitFor } from "storybook/test";
import { Button } from "./button";
import { DropPanel, DropPanelClose, DropPanelContent, DropPanelTrigger } from "./drop-panel";

const meta = {
  title: "Primitives/DropPanel",
  component: DropPanelContent,
  tags: ["autodocs"],
  args: { title: "Added to bag" },
} satisfies Meta<typeof DropPanelContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The storefront's "Added to bag": what was added, then View bag and Checkout side by side. */
export const AddedToBag: Story = {
  render: () => (
    <DropPanel>
      <DropPanelTrigger asChild>
        <Button shape="pill">Add to bag</Button>
      </DropPanelTrigger>
      <DropPanelContent
        title="Added to bag"
        icon={<CircleCheck className="size-5" strokeWidth={1.5} aria-hidden />}
        footer={
          <>
            <DropPanelClose asChild>
              <Button variant="secondary" size="lg" shape="pill">
                View bag (1)
              </Button>
            </DropPanelClose>
            <Button size="lg" shape="pill">
              Checkout
            </Button>
          </>
        }
      >
        <div className="flex gap-4">
          <div className="aspect-4/5 w-20 shrink-0 bg-surface" />
          <div className="flex flex-col">
            <p className="text-body font-medium text-ink">Linen Overshirt</p>
            <p className="text-small text-ink-muted">Black / M</p>
          </div>
        </div>
      </DropPanelContent>
    </DropPanel>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add to bag" }));
    const panel = await screen.findByRole("dialog", { name: "Added to bag" });
    await expect(panel).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "View bag (1)" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Added to bag" })).toBeNull());
  },
};

export const Open: Story = {
  render: () => (
    <DropPanel defaultOpen>
      <DropPanelContent title="Added to bag" description="1 item in your bag">
        <p className="text-body text-ink-muted">What was added appears here.</p>
      </DropPanelContent>
    </DropPanel>
  ),
  play: async () => {
    const panel = await screen.findByRole("dialog", { name: "Added to bag" });
    await expect(panel).toBeVisible();
    await expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
  },
};
