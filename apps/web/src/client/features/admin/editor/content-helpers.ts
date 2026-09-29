import { linesError, toLines } from "../text-lines";

// Pure parts of the editor's description, bullets and "Product details" boxes (specs/product-editor-on-page.md).

/**
 * The `styles` entry of a style (the same spelling first, then ignoring case and spaces at the ends); -1 when there
 * is none yet. For a product without styles, `style` is "" and finds the "" entry. One lookup for the whole editor:
 * the bullets and the Edit style popup must edit the same entry.
 */
export { styleEntryIndex } from "./buybox-styles";

/** What `safeParse` gives back, as much as linesProblem reads of it. */
type Checked =
  | { success: true }
  | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } };

/**
 * Checks a one-per-line box (Benefits, Product details) with its schema before it goes into the form: the list's own
 * problem ("Add up to 12 benefits"), or a line's with where it is in the box ("Line 3: Keep each line under 200
 * characters"). null when it's fine.
 */
export function linesProblem(
  schema: { safeParse: (value: unknown) => Checked },
  text: string,
): string | null {
  const checked = schema.safeParse(toLines(text));
  if (checked.success) return null;
  const issue = checked.error.issues[0];
  if (!issue) return null;
  const [line] = issue.path;
  const error =
    typeof line === "number" ? { [line]: { message: issue.message } } : { message: issue.message };
  return linesError(error, text) ?? issue.message;
}
