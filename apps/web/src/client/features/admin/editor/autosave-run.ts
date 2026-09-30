import { productSchema, type ProductInput } from "@virzeen/validators";
import { messageFor } from "@/client/lib/error-messages";
import type { ActionError } from "@/server/actions/result";
import { createSaveQueue, type SaveQueue, type SaveState } from "./autosave-queue";
import { errorsByPath, formPathOf } from "./field-issues";
import { diffPaths, sameValues, savedPatches, type Patch } from "./merge-saved";

/** What a save hands back (catalogService.saveProduct): the form's values as saved, with ids and numbers. */
export type SavedProduct = { id: string; slug: string; savedAt: string; values: ProductInput };
export type SaveOutcome = { ok: true; data: SavedProduct } | { ok: false; error: ActionError };

export type AutosaveDeps = {
  productId: string;
  /** The product's last save when the page opened (ISO) and its values then. */
  savedAt: string;
  savedValues: ProductInput;
  getValues: () => ProductInput;
  /** saveProductAction. */
  send: (input: { id: string; product: unknown }) => Promise<SaveOutcome>;
  applyPatches: (patches: readonly Patch[]) => void;
  /** Replaces every field error with these ([path, message]; "" = the whole product). */
  showErrors: (errors: readonly [string, string][]) => void;
  setState: (state: SaveState) => void;
  onSaved: (saved: SavedProduct) => void;
  /** The server said the slug is taken: true after another one was picked to try (it saves again). */
  onSlugTaken: () => boolean;
  isOnline: () => boolean;
};

const OFFLINE = "You're offline. Check your connection and try again.";

/**
 * The product editor's autosave without React (specs/product-editor-on-page.md "Autosave"). Each run checks the
 * whole product with productSchema: problems go onto their fields and nothing is sent ("invalid"). Otherwise it
 * sends the product ("saving"), unless nothing changed since the last save. The answer is merged back without
 * losing edits made meanwhile: with none, the form becomes exactly what was saved; otherwise only what the server
 * made is taken (ids, SKUs, style numbers, photo descriptions) and it saves again.
 */
export function createAutosave(deps: AutosaveDeps): SaveQueue {
  let lastSaved: ProductInput = structuredClone(deps.savedValues);
  let lastSavedAt = deps.savedAt;

  const queue = createSaveQueue(async () => {
    const values = deps.getValues();
    const checked = productSchema.safeParse(values);
    if (!checked.success) {
      const errors = errorsByPath(checked.error.issues);
      deps.showErrors(errors);
      deps.setState({ status: "invalid", message: errors[0]?.[1] ?? "" });
      return;
    }
    deps.showErrors([]);
    if (sameValues(values, lastSaved)) return deps.setState({ status: "saved", savedAt: lastSavedAt });
    deps.setState({ status: "saving" });
    // getValues() shares nested objects with the form, which later edits change in place.
    const sent = structuredClone(values);
    let result: SaveOutcome;
    try {
      result = await deps.send({ id: deps.productId, product: checked.data });
    } catch {
      const message = deps.isOnline() ? messageFor({ code: "INTERNAL", message: "" }) : OFFLINE;
      return deps.setState({ status: "error", message });
    }
    if (!result.ok) {
      const errors = Object.entries(result.error.fields ?? {}).map(([key, message]): [string, string] => [
        formPathOf(key),
        message,
      ]);
      if (errors.some(([path]) => path === "slug") && deps.onSlugTaken()) return void queue.commit();
      if (errors.length === 0) return deps.setState({ status: "error", message: messageFor(result.error) });
      deps.showErrors(errors);
      return deps.setState({ status: "invalid", message: errors[0]?.[1] ?? messageFor(result.error) });
    }
    const saved = result.data;
    lastSaved = structuredClone(saved.values);
    lastSavedAt = saved.savedAt;
    const current = deps.getValues();
    const unchanged = sameValues(current, sent);
    deps.applyPatches(
      unchanged ? diffPaths(current, saved.values) : savedPatches(sent, current, saved.values),
    );
    deps.onSaved(saved);
    deps.setState({ status: "saved", savedAt: saved.savedAt });
    if (!unchanged) void queue.commit();
  });
  return queue;
}
