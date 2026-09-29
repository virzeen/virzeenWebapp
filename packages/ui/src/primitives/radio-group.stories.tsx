import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { cn } from "../lib/cn";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "Primitives/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  argTypes: { variant: { control: "select", options: ["default", "card", "swatch"] } },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup aria-label="Delivery" defaultValue="standard">
      <RadioGroupItem value="standard" label="Standard delivery" description="2–4 days" />
      <RadioGroupItem value="pickup" label="Store pickup" description="Unavailable in phase 1" disabled />
    </RadioGroup>
  ),
};

/** Variant picker: unavailable sizes stay visible, disabled, with a line-through. */
export const SizePicker: Story = {
  render: () => (
    <RadioGroup aria-label="Size" variant="card" className="max-w-xs">
      <RadioGroupItem value="S" label="S" />
      <RadioGroupItem value="M" label="M" />
      <RadioGroupItem value="L" label="L" />
      <RadioGroupItem value="XL" label="XL" disabled />
    </RadioGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("radio", { name: "XL" })).toBeDisabled();
    await userEvent.click(canvas.getByRole("radio", { name: "M" }));
    await expect(canvas.getByRole("radio", { name: "M" })).toBeChecked();
  },
};

export const PaymentMethods: Story = {
  render: () => (
    <RadioGroup
      aria-label="Payment method"
      variant="card"
      defaultValue="ESEWA"
      className="max-w-md grid-cols-1"
    >
      <RadioGroupItem
        value="COD"
        label="Cash on delivery"
        description="Pay the courier when your order arrives"
      />
      <RadioGroupItem value="ESEWA" label="eSewa" description="You'll be taken to eSewa to pay" />
      <RadioGroupItem value="KHALTI" label="Khalti" description="You'll be taken to Khalti to pay" />
    </RadioGroup>
  ),
};

/** Product styles: a picture per style (the app passes a CloudImage as `media`); sold-out styles are disabled. */
export const StyleSwatches: Story = {
  render: () => (
    <RadioGroup aria-label="Style" variant="swatch" defaultValue="mountain" className="max-w-sm">
      {[
        ["mountain", "Mountain print", "bg-ink"],
        ["river", "River print", "bg-ink-muted"],
        ["city", "City print", "bg-line-strong"],
      ].map(([value, label, tone]) => (
        <RadioGroupItem
          key={value}
          value={value as string}
          label={label}
          disabled={value === "city"}
          media={<span className={cn("block aspect-4/5 rounded-sm", tone)} />}
        />
      ))}
    </RadioGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("radio", { name: "Mountain print" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "City print" })).toBeDisabled();
    await userEvent.click(canvas.getByRole("radio", { name: "River print" }));
    await expect(canvas.getByRole("radio", { name: "River print" })).toBeChecked();
  },
};
