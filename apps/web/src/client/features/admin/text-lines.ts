// "One per line" text boxes (benefits, product details, how-to-measure tips) ↔ the lists the schemas check.

/** The lines of a textarea as a list: trimmed, blank lines left out. */
export const toLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const sameLines = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((line, i) => line === b[i]);

/** The textarea line (1-based) of the list's item `item`, counting only the lines that aren't blank. */
function lineOf(text: string, item: number) {
  let seen = -1;
  for (const [i, line] of text.split("\n").entries()) {
    if (line.trim() && ++seen === item) return i + 1;
  }
  return item + 1;
}

/**
 * The message to show under the box for react-hook-form's error on the list: the list's own ("Add up to 12
 * benefits"), else the first line's, with the line it is on in the box ("Line 3: Keep each line under…").
 */
export function linesError(error: unknown, text: string): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const { message, root } = error as { message?: unknown; root?: { message?: unknown } };
  if (typeof message === "string") return message;
  if (typeof root?.message === "string") return root.message;
  for (const [key, item] of Object.entries(error)) {
    const itemMessage = (item as { message?: unknown } | undefined)?.message;
    if (/^\d+$/.test(key) && typeof itemMessage === "string") {
      return `Line ${lineOf(text, Number(key))}: ${itemMessage}`;
    }
  }
  return undefined;
}
