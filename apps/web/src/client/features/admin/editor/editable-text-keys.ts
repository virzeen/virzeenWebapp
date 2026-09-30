// The pure parts of editing text in place (EditableText): which key does what, and whether the text changed.

export type EditKeyAction = "commit" | "cancel" | null;

/**
 * True when the main pointer is a finger (phones, tablets). There an edit that ends (the on-screen keyboard's Enter/Go,
 * or a picked option) doesn't hand focus back to the pencil: that only draws a focus ring on it (owner, 2026-09-30).
 * The box just closes, and the on-screen keyboard with it. With a mouse or keyboard, focus goes back as before.
 */
export const coarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

type KeyPress = {
  key: string;
  multiline: boolean;
  /** Ctrl (Windows) or Cmd (Mac) held. */
  ctrlOrMeta?: boolean;
  shift?: boolean;
  /** An input method (e.g. for Devanagari) is still composing: its Enter picks a word, it doesn't save. */
  composing?: boolean;
};

/**
 * Escape cancels. Enter saves a one-line field; in a long text Enter makes a new line and Ctrl/Cmd+Enter saves
 * (clicking or tabbing outside saves both). Everything else types.
 */
export function editKeyAction({
  key,
  multiline,
  ctrlOrMeta = false,
  shift = false,
  composing = false,
}: KeyPress) {
  if (composing) return null;
  if (key === "Escape") return "cancel";
  if (key !== "Enter") return null;
  if (!multiline) return shift ? null : "commit";
  return ctrlOrMeta ? "commit" : null;
}

/** The parts of a keydown event editKeyAction reads. */
export const keyPress = (
  event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    nativeEvent: { isComposing: boolean };
  },
  multiline: boolean,
): KeyPress => ({
  key: event.key,
  multiline,
  ctrlOrMeta: event.ctrlKey || event.metaKey,
  shift: event.shiftKey,
  composing: event.nativeEvent.isComposing,
});

/** The text to save: without spaces at the ends; a one-line field on one line (a pasted line break is a space). */
export function normalizeDraft(text: string, multiline: boolean): string {
  const unified = text.replace(/\r\n?/g, "\n");
  return (multiline ? unified : unified.replace(/\s*\n\s*/g, " ")).trim();
}

/** True when saving `draft` would change `value` (spaces at the ends don't count). */
export const hasChanged = (draft: string, value: string, multiline: boolean) =>
  normalizeDraft(draft, multiline) !== normalizeDraft(value, multiline);

/**
 * The pencil's name after "Edit": the label with a lower-case first letter ("Product name" → "product name"), but
 * words in capitals stay ("SKU codes", "URL slug").
 */
export function editLabelFor(label: string): string {
  const [first = "", second = ""] = label;
  return second && second === second.toUpperCase() && /[A-Za-z]/.test(second)
    ? label
    : first.toLowerCase() + label.slice(1);
}
