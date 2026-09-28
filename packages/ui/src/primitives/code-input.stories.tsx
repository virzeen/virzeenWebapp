import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { CodeInput, type CodeInputProps } from "./code-input";
import { FormField } from "./form-field";

/** CodeInput is controlled; stories keep the value in local state. */
function Controlled(props: CodeInputProps) {
  const [code, setCode] = useState(props.value);
  return <CodeInput {...props} value={code} onChange={setCode} />;
}

const meta = {
  title: "Primitives/CodeInput",
  component: CodeInput,
  tags: ["autodocs"],
  args: { "aria-label": "6-digit code", value: "", onChange: () => {} },
  argTypes: { length: { control: { type: "number", min: 4, max: 8 } } },
  render: (args) => <Controlled {...args} />,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CodeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const PartlyFilled: Story = { args: { value: "482" } };
export const Filled: Story = { args: { value: "482913" } };
export const Error: Story = { args: { value: "482", "aria-invalid": true } };
export const Disabled: Story = { args: { disabled: true, value: "482913" } };

export const TypingAndPasting: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText("6-digit code");
    await userEvent.type(input, "12ab34");
    await expect(input).toHaveValue("1234");
    // A pasted code replaces what is there (spaces and dashes dropped), even with digits already entered.
    await userEvent.click(input);
    await userEvent.paste("482 913");
    await expect(input).toHaveValue("482913");
    // Editing happens at the end, whatever the caret keys do.
    await userEvent.keyboard("{Home}{Backspace}");
    await expect(input).toHaveValue("48291");
  },
};

export const InFormField: Story = {
  args: { "aria-label": undefined },
  render: (args) => (
    <FormField label="6-digit code" error="Enter the 6-digit code we sent to asha@example.com" required>
      <Controlled {...args} />
    </FormField>
  ),
};
