import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { FormField } from "./form-field";
import { Select } from "./select";

const meta = {
  title: "Primitives/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    "aria-label": "District",
    placeholder: "Choose a district",
    options: ["Bhaktapur", "Kathmandu", "Lalitpur"],
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: "Lalitpur" } };
export const WithDisabledOption: Story = {
  args: {
    options: [
      { value: "newest", label: "Newest" },
      { value: "price-asc", label: "Price: low to high" },
      { value: "price-desc", label: "Price: high to low", disabled: true },
    ],
    "aria-label": "Sort",
    placeholder: "Sort by",
  },
};
export const Disabled: Story = { args: { disabled: true } };

export const InFormFieldWithError: Story = {
  args: { "aria-label": undefined },
  render: (args) => (
    <FormField label="District" error="Choose your district" required>
      <Select {...args} />
    </FormField>
  ),
};

/**
 * With react-hook-form: `ref` lets a failed submit focus the select, and `onBlur` runs when focus leaves it,
 * not when its list opens.
 */
export const FocusAndBlur: Story = {
  args: { "aria-label": undefined, onBlur: fn() },
  render: function FocusAndBlurStory(args) {
    const ref = useRef<HTMLButtonElement>(null);
    return (
      <div className="flex flex-col gap-4">
        <FormField label="District" error="Choose your district" required>
          <Select {...args} ref={ref} />
        </FormField>
        <Button variant="secondary" onClick={() => ref.current?.focus()}>
          Focus the district
        </Button>
      </div>
    );
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Focus the district" }));
    const trigger = canvas.getByRole("combobox", { name: /District/ });
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    // The list fades in from transparent, so wait for it (as the Dialog story does).
    const listbox = await screen.findByRole("listbox");
    await waitFor(() => expect(listbox).toBeVisible());
    await expect(args.onBlur).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.tab();
    await expect(args.onBlur).toHaveBeenCalledOnce();
  },
};

/** Inside a Dialog (the admin's New product popup): the list opens above the dialog, not under its overlay. */
export const InADialog: Story = {
  args: { "aria-label": undefined },
  render: (args) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">New product</Button>
      </DialogTrigger>
      <DialogContent title="New product">
        <FormField label="Category" required>
          <Select {...args} options={["Tops", "Bottoms", "Accessories"]} placeholder="Choose a category" />
        </FormField>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "New product" }));
    const dialog = await screen.findByRole("dialog", { name: "New product" });
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.click(await screen.findByRole("combobox", { name: /Category/ }));
    const option = await screen.findByRole("option", { name: "Bottoms" });
    await waitFor(() => expect(option).toBeVisible());
    await userEvent.click(option);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /Category/ })).toHaveTextContent("Bottoms"),
    );
  },
};
