import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { FormField } from "./form-field";
import { Input, Textarea } from "./input";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Select } from "./select";

const meta = {
  title: "Primitives/FormField",
  component: FormField,
  tags: ["autodocs"],
  args: { label: "Full name", children: null },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithInput: Story = {
  render: () => (
    <FormField label="Full name" required>
      <Input autoComplete="name" />
    </FormField>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText(/Full name/)).toHaveAttribute("aria-required", "true");
  },
};

export const WithHelper: Story = {
  render: () => (
    <FormField label="Mobile number" helper="The courier will call this number" required>
      <Input type="tel" inputMode="numeric" autoComplete="tel" />
    </FormField>
  ),
};

export const WithError: Story = {
  render: () => (
    <FormField label="Mobile number" error="Enter a 10-digit mobile number starting with 97 or 98" required>
      <Input type="tel" inputMode="numeric" autoComplete="tel" defaultValue="12345" />
    </FormField>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(/Mobile number/);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription("Enter a 10-digit mobile number starting with 97 or 98");
  },
};

export const WithTextarea: Story = {
  render: () => (
    <FormField label="Landmark" helper="Optional — helps the courier find you">
      <Textarea rows={3} />
    </FormField>
  ),
};

function SelectExample({ error }: { error?: string }) {
  const [value, setValue] = useState("");
  return (
    <FormField label="Province" error={error} required>
      <Select
        value={value}
        onValueChange={setValue}
        options={["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"]}
        placeholder="Choose a province"
      />
    </FormField>
  );
}

export const WithSelect: Story = { render: () => <SelectExample /> };
export const WithSelectError: Story = { render: () => <SelectExample error="Choose your province" /> };

export const WithRadioGroup: Story = {
  render: () => (
    <FormField label="Payment method" required>
      <RadioGroup variant="card" defaultValue="COD" className="grid-cols-1">
        <RadioGroupItem
          value="COD"
          label="Cash on delivery"
          description="Pay the courier when your order arrives"
        />
        <RadioGroupItem value="ESEWA" label="eSewa" description="You'll be taken to eSewa to pay" />
        <RadioGroupItem value="KHALTI" label="Khalti" description="You'll be taken to Khalti to pay" />
      </RadioGroup>
    </FormField>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radiogroup", { name: /Payment method/ })).toBeInTheDocument();
  },
};
