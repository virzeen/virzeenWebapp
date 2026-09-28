import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
