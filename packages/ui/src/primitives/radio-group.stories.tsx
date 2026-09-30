import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { cn } from "../lib/cn";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "Primitives/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  argTypes: { variant: { control: "select", options: ["default", "card", "swatch", "segmented"] } },
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

/** A few short choices joined in one pill, e.g. the size guide's units. */
export const Segmented: Story = {
  render: () => (
    <RadioGroup aria-label="Units" variant="segmented" defaultValue="cm">
      <RadioGroupItem value="cm" label="cm" />
      <RadioGroupItem value="in" label="in" />
    </RadioGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("radio", { name: "cm" })).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: "in" }));
    await expect(canvas.getByRole("radio", { name: "in" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "cm" })).not.toBeChecked();
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

/**
 * Product styles: square picture tiles without a caption (the app passes a square CloudImage as `media`). The label is
 * the accessible name and the tile's `title`; a sold-out style is disabled, dimmed and crossed out.
 */
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
          media={<span className={cn("block aspect-square", tone)} />}
        />
      ))}
    </RadioGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("radio", { name: "Mountain print" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Mountain print" })).toHaveAttribute(
      "title",
      "Mountain print",
    );
    await expect(canvas.getByRole("radio", { name: "City print" })).toBeDisabled();
    await userEvent.click(canvas.getByRole("radio", { name: "River print" }));
    await expect(canvas.getByRole("radio", { name: "River print" })).toBeChecked();
    // Square 64px tiles: a comfortable touch target.
    const { width, height } = canvas.getByRole("radio", { name: "River print" }).getBoundingClientRect();
    await expect(width).toBe(height);
    await expect(height).toBeGreaterThanOrEqual(44);
  },
};
