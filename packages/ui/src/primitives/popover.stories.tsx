import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const meta = {
  title: "Primitives/Popover",
  component: PopoverContent,
  tags: ["autodocs"],
  argTypes: {
    align: { control: "select", options: ["start", "center", "end"] },
    elevation: { control: "inline-radio", options: ["raised", "flat"] },
  },
} satisfies Meta<typeof PopoverContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The product editor's status chip: what is still missing before the product can be published. */
export const Checklist: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" shape="pill">
          Draft
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-labelledby="popover-story-heading">
        <p className="text-small text-ink-muted">Only admins can see this product until you publish it.</p>
        <h2 id="popover-story-heading" className="text-small font-medium">
          Before publishing
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-6 text-small">
          <li>Name: done</li>
          <li>At least one photo: still to do</li>
        </ul>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Draft" }));
    const panel = await screen.findByRole("dialog", { name: "Before publishing" });
    await waitFor(() => expect(panel).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.getByRole("button", { name: "Draft" })).toHaveFocus());
  },
};

export const OpenByDefault: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" shape="pill">
          Published
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Status">
        <p className="text-small text-ink-muted">Customers can see this product.</p>
      </PopoverContent>
    </Popover>
  ),
};

/** `elevation="flat"`: no border and no shadow, like Nike's "Sort By" list (the shop's `SortMenu`). */
export const Flat: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="ghost" shape="pill">
          Sort By
        </Button>
      </PopoverTrigger>
      <PopoverContent elevation="flat" align="end" aria-label="Sort by">
        <ul className="flex min-w-44 flex-col text-right">
          <li className="flex min-h-11 items-center justify-end font-medium">Newest</li>
          <li className="flex min-h-11 items-center justify-end">Price: High-Low</li>
          <li className="flex min-h-11 items-center justify-end">Price: Low-High</li>
        </ul>
      </PopoverContent>
    </Popover>
  ),
  play: async () => {
    const panel = await screen.findByRole("dialog", { name: "Sort by" });
    await waitFor(() => expect(getComputedStyle(panel).boxShadow).toBe("none"));
  },
};
