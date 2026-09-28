import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { Button } from "./button";
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
  argTypes: {
    length: { control: { type: "number", min: 4, max: 8 } },
    status: { control: "inline-radio", options: ["checking", "success"] },
  },
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

/** While the code is checked: digits stay visible but can't change, and focus stays in the field. */
export const Checking: Story = {
  args: { value: "482913", status: "checking" },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText("6-digit code");
    await userEvent.click(input);
    await expect(input).toHaveFocus();
    await expect(input).toHaveAttribute("readonly");
    await userEvent.keyboard("{Backspace}7");
    await userEvent.paste("111111");
    await expect(input).toHaveValue("482913");
  },
};

export const Success: Story = { args: { value: "482913", status: "success" } };

/** A wrong code: red boxes that shake once (not with reduced motion). A new `errorKey` shakes them again. */
export const WrongCode: Story = {
  args: { "aria-label": undefined, value: "482913" },
  render: function WrongCodeStory(args) {
    const [attempt, setAttempt] = useState(1);
    return (
      <div className="flex flex-col gap-4">
        <FormField label="6-digit code" error="That code isn't right. Check it and try again." required>
          <Controlled {...args} errorKey={attempt} />
        </FormField>
        <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
          Shake again
        </Button>
      </div>
    );
  },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText(/6-digit code/);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await userEvent.click(input);
    const boxes = input.previousElementSibling;
    // A plain click() doesn't move focus, like a new error arriving while the person is in the field.
    canvas.getByRole("button", { name: "Shake again" }).click();
    // The shake replays because only the boxes remount; the real input stays, and so does focus.
    await waitFor(() => expect(input.previousElementSibling).not.toBe(boxes));
    await expect(canvas.getByLabelText(/6-digit code/)).toBe(input);
    await expect(input).toHaveFocus();
  },
};

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

/** `onComplete` fires once per completed code (typed or pasted), never for a partial one. */
export const CompletingTheCode: Story = {
  args: { onComplete: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByLabelText("6-digit code");
    await userEvent.type(input, "48291");
    await expect(args.onComplete).not.toHaveBeenCalled();
    await userEvent.type(input, "3");
    await expect(args.onComplete).toHaveBeenCalledTimes(1);
    await expect(args.onComplete).toHaveBeenLastCalledWith("482913");
    // A seventh digit changes nothing, so it doesn't complete again.
    await userEvent.keyboard("7");
    await expect(args.onComplete).toHaveBeenCalledTimes(1);

    await userEvent.keyboard("{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}");
    await expect(input).toHaveValue("");
    await userEvent.paste("482 913");
    await expect(input).toHaveValue("482913");
    await expect(args.onComplete).toHaveBeenCalledTimes(2);
    await expect(args.onComplete).toHaveBeenLastCalledWith("482913");
  },
};

/** A full code set by the page (not typed, pasted or autofilled) doesn't complete it. */
export const SetByThePage: Story = {
  args: { onComplete: fn() },
  render: function SetByThePageStory(args) {
    const [code, setCode] = useState("");
    return (
      <div className="flex flex-col gap-4">
        <CodeInput {...args} value={code} onChange={setCode} />
        <Button variant="secondary" onClick={() => setCode("482913")}>
          Fill in a code
        </Button>
      </div>
    );
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Fill in a code" }));
    await expect(canvas.getByLabelText("6-digit code")).toHaveValue("482913");
    await expect(args.onComplete).not.toHaveBeenCalled();
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
