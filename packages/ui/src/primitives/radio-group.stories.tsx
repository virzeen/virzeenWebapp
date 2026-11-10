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

/**
 * Sold-out sizes that can still be picked (`unavailable`, specs/notify-me.md): struck through like a disabled size, but
 * pickable so the product page can offer "Notify me when it's back". Picked, an ink outline replaces the fill.
 */
export const SizePickerSoldOutPickable: Story = {
  render: () => (
    <RadioGroup aria-label="Size" variant="card" className="max-w-xs">
      <RadioGroupItem value="S" label="S" />
      <RadioGroupItem value="M" label="M" unavailable />
      <RadioGroupItem value="L" label="L" />
      <RadioGroupItem value="XL" label="XL" unavailable />
    </RadioGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    const soldOut = canvas.getByRole("radio", { name: "XL, sold out" });
    await expect(soldOut).toBeEnabled();
    await expect(soldOut).toHaveAttribute("data-unavailable");
    await userEvent.click(soldOut);
    await expect(soldOut).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "L" })).not.toHaveAttribute("data-unavailable");
  },
};

/** Add to bag before a size was picked: a red line around the sizes and the message under them. */
export const SizePickerInvalid: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-2">
      <RadioGroup aria-label="Size" aria-invalid aria-describedby="size-error" variant="card">
        <RadioGroupItem value="S" label="S" />
        <RadioGroupItem value="M" label="M" />
        <RadioGroupItem value="L" label="L" />
        <RadioGroupItem value="XL" label="XL" disabled />
      </RadioGroup>
      <p id="size-error" className="pt-2 text-small text-danger">
        Select a size
      </p>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radiogroup", { name: "Size" })).toHaveAccessibleDescription(
      "Select a size",
    );
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

/** A sold-out style that can still be picked (`unavailable`): dimmed and crossed out like a disabled tile. */
export const StyleSwatchesSoldOutPickable: Story = {
  render: () => (
    <RadioGroup aria-label="Style" variant="swatch" defaultValue="mountain" className="max-w-sm">
      <RadioGroupItem
        value="mountain"
        label="Mountain print"
        media={<span className="block aspect-square bg-ink" />}
      />
      <RadioGroupItem
        value="city"
        label="City print"
        unavailable
        media={<span className="block aspect-square bg-line-strong" />}
      />
    </RadioGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    const soldOut = canvas.getByRole("radio", { name: "City print, sold out" });
    await expect(soldOut).toHaveAttribute("title", "City print");
    await userEvent.click(soldOut);
    await expect(soldOut).toBeChecked();
  },
};
