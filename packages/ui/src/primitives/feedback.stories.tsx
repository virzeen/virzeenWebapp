import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShoppingBag } from "lucide-react";
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

export const Toasts: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Toaster />
      <Button onClick={() => toast.success("Added to bag")}>Success toast</Button>
      <Button
        variant="secondary"
        onClick={() => toast.message("Removed from bag", { action: { label: "Undo", onClick: () => {} } })}
      >
        Toast with undo
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
