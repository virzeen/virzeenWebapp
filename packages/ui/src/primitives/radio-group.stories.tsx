import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "Primitives/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  argTypes: { variant: { control: "select", options: ["default", "card"] } },
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
