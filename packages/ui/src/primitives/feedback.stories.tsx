import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShoppingBag } from "lucide-react";
import { expect } from "storybook/test";
import { Alert } from "./alert";
import { Badge } from "./badge";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { ButtonLink } from "./link";
import { Skeleton } from "./skeleton";
import { toast, Toaster } from "./toast";

const meta = {
  title: "Primitives/Feedback",
  component: Alert,
  tags: ["autodocs"],
  args: { children: "We're confirming your payment. This usually takes a minute." },
  argTypes: { variant: { control: "select", options: ["info", "success", "warning", "danger"] } },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AlertInfo: Story = {};
export const AlertSuccess: Story = { args: { variant: "success", children: "Your address was saved." } };
export const AlertWarning: Story = {
  args: {
    variant: "warning",
    title: "A price changed",
    children: "A price changed since you added this item. Please review your bag.",
  },
};
export const AlertDanger: Story = {
  args: {
    variant: "danger",
    children: "Payment didn't go through. Your bag is saved — try again or choose another method.",
    action: <Button size="sm">Try again</Button>,
  },
};

export const Badges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>New</Badge>
      <Badge variant="accent">Limited</Badge>
      <Badge variant="success">Paid</Badge>
      <Badge variant="warning">Only 3 left</Badge>
      <Badge variant="danger">Out of stock</Badge>
    </div>
  ),
};

export const Skeletons: Story = {
  render: () => (
    <div className="grid max-w-md grid-cols-2 gap-4">
      {["a", "b"].map((id) => (
        <div key={id} className="flex flex-col gap-2">
          <Skeleton shape="image" />
          <Skeleton shape="text" className="w-3/4" />
          <Skeleton shape="text" className="w-1/3" />
        </div>
      ))}
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <EmptyState
      icon={<ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />}
      title="Your bag is empty."
      action={
        <ButtonLink href="/shop" shape="pill">
          Browse the collection
        </ButtonLink>
      }
    />
  ),
};

/** When the empty state is the whole page (404, error, offline), its title is the page's h1. */
export const EmptyAsPage: Story = {
  render: () => (
    <EmptyState
      titleAs="h1"
      title="We couldn't find that page."
      description="It may have moved, or the link might be wrong."
      action={
        <ButtonLink href="/shop" shape="pill">
          Browse the collection
        </ButtonLink>
      }
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("We couldn't find that page.");
  },
};

/**
 * Default and success toasts are ink; error toasts are danger. Add to bag and bag Undo don't use toasts: the
 * drawer says "Added to bag" and Undo sits inline where the line was (patterns.md §7).
 */
export const Toasts: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Toaster />
      <Button onClick={() => toast.success("Address saved")}>Success toast</Button>
      <Button
        variant="secondary"
        onClick={() => toast.message("We sent a new code", { description: "It expires in 10 minutes." })}
      >
        Default toast with description
      </Button>
      <Button
        variant="destructive"
        onClick={() => toast.error("Something went wrong on our side. Please try again.")}
      >
        Error toast
      </Button>
    </div>
  ),
};
