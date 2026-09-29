import type { ProductInput } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import type { SaveState } from "./autosave-queue";
import { createAutosave, type SaveOutcome, type SavedProduct } from "./autosave-run";
import { withChanges } from "./field-issues";

const CATEGORY = "tz4a98xxat96iws9zmbrgj3a";
const PRODUCT = "c0000000000000000000000p";
const ROW_ID = "c0000000000000000000000v";

const product = (extra: Partial<ProductInput> = {}): ProductInput => ({
  name: "Linen shirt",
  slug: "linen-shirt",
  description: "",
  care: "",
  benefits: [],
  details: [],
  countryOfOrigin: "China",
  seoDescription: "",
  categoryId: CATEGORY,
  sizeGuideId: "",
  collectionIds: [],
  isPublished: false,
  images: [],
  features: [],
  styles: [{ color: "", colourShown: "", code: "VZ0001-101" }],
  shippingPaisa: 15_000,
  variants: [
    { id: ROW_ID, sku: "VZ-LINEN-M", size: "M", color: "", pricePaisa: 150_000, stock: 2, isActive: true },
  ],
  ...extra,
});

type Pending = { input: { id: string; product: unknown }; answer: (outcome: SaveOutcome) => Promise<void> };

/** The autosave with a plain object as the form and a server the test answers by hand. */
function setup(start: ProductInput = product()) {
  let values = structuredClone(start);
  const states: SaveState[] = [];
  const errors: [string, string][][] = [];
  const requests: Pending[] = [];
  const saved: SavedProduct[] = [];
  let slugTaken = () => false;
  const queue = createAutosave({
    productId: PRODUCT,
    savedAt: "2026-09-30T00:00:00.000Z",
    savedValues: start,
    getValues: () => values,
    send: (input) =>
      new Promise((resolve) => {
        requests.push({
          input,
          answer: async (outcome) => {
            resolve(outcome);
            for (let i = 0; i < 10; i++) await Promise.resolve();
          },
        });
      }),
    applyPatches: (patches) => {
      values = withChanges(
        values,
        patches.map(({ path, value }) => ({ name: path, value })),
      );
    },
    showErrors: (list) => errors.push([...list]),
    setState: (state) => states.push(state),
    onSaved: (result) => saved.push(result),
    onSlugTaken: () => slugTaken(),
    isOnline: () => true,
  });
  return {
    queue,
    states,
    errors,
    requests,
    saved,
    get values() {
      return values;
    },
    edit: (changes: Partial<ProductInput>) => {
      values = { ...values, ...changes };
    },
    onSlugTaken: (handler: () => boolean) => {
      slugTaken = handler;
    },
  };
}

const tick = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const ok = (values: ProductInput, savedAt = "2026-09-30T01:00:00.000Z"): SaveOutcome => ({
  ok: true,
  data: { id: PRODUCT, slug: values.slug, savedAt, values },
});

describe("autosave", () => {
  it("sends nothing when nothing changed since the last save", async () => {
    const editor = setup();
    await editor.queue.commit();
    expect(editor.requests).toHaveLength(0);
    expect(editor.states.at(-1)).toEqual({ status: "saved", savedAt: "2026-09-30T00:00:00.000Z" });
  });

  it("puts problems on their fields and sends nothing while the product is invalid", async () => {
    const editor = setup();
    editor.edit({ name: "" });
    await editor.queue.commit();
    expect(editor.requests).toHaveLength(0);
    expect(editor.errors.at(-1)).toEqual([["name", "Enter the product name"]]);
    expect(editor.states.at(-1)).toEqual({ status: "invalid", message: "Enter the product name" });
  });

  it("saves one at a time and sends the latest values in the one save queued meanwhile", async () => {
    const editor = setup();
    editor.edit({ name: "Linen shirt 2" });
    void editor.queue.commit();
    await tick();
    expect(editor.states.at(-1)).toEqual({ status: "saving" });
    editor.edit({ name: "Linen shirt 3" });
    void editor.queue.commit();
    editor.edit({ name: "Linen shirt 4" });
    void editor.queue.commit();
    expect(editor.requests).toHaveLength(1);
    await editor.requests[0]!.answer(ok(product({ name: "Linen shirt 2" })));
    expect(editor.requests).toHaveLength(2);
    expect((editor.requests[1]!.input.product as ProductInput).name).toBe("Linen shirt 4");
    await editor.requests[1]!.answer(ok(product({ name: "Linen shirt 4" }), "2026-09-30T02:00:00.000Z"));
    expect(editor.values.name).toBe("Linen shirt 4");
    expect(editor.states.at(-1)).toEqual({ status: "saved", savedAt: "2026-09-30T02:00:00.000Z" });
  });

  it("takes the saved values when nothing changed during the request", async () => {
    const editor = setup();
    editor.edit({
      variants: [
        ...editor.values.variants,
        { sku: "", size: "L", color: "", pricePaisa: 150_000, stock: 0, isActive: true },
      ],
    });
    void editor.queue.commit();
    await tick();
    const newRow = {
      id: "c0000000000000000000000w",
      sku: "VZ-LINEN-L",
      size: "L",
      color: "",
      pricePaisa: 150_000,
      stock: 0,
      isActive: true,
    };
    await editor.requests[0]!.answer(ok(product({ variants: [product().variants[0]!, newRow] })));
    expect(editor.values.variants[1]).toEqual(newRow);
    expect(editor.requests).toHaveLength(1);
  });

  it("keeps edits made during the request, takes the new row's id and SKU, and saves again", async () => {
    const editor = setup();
    const added = { sku: "", size: "L", color: "", pricePaisa: 150_000, stock: 0, isActive: true };
    editor.edit({ variants: [...editor.values.variants, added] });
    void editor.queue.commit();
    await tick();
    // The admin sets the new row's stock while the save is running (not committed yet).
    editor.edit({ variants: [editor.values.variants[0]!, { ...added, stock: 5 }] });
    const newRow = { ...added, id: "c0000000000000000000000w", sku: "VZ-LINEN-L" };
    await editor.requests[0]!.answer(ok(product({ variants: [product().variants[0]!, newRow] })));
    expect(editor.values.variants[1]).toEqual({ ...newRow, stock: 5 });
    expect(editor.requests).toHaveLength(2);
    expect((editor.requests[1]!.input.product as ProductInput).variants[1]).toMatchObject({
      id: newRow.id,
      stock: 5,
    });
  });

  it("shows the server's problem with Try again, and a retry sends the values again", async () => {
    const editor = setup();
    editor.edit({ name: "Linen shirt 2" });
    void editor.queue.commit();
    await tick();
    await editor.requests[0]!.answer({ ok: false, error: { code: "INTERNAL", message: "boom" } });
    expect(editor.states.at(-1)).toEqual({
      status: "error",
      message: "Something went wrong on our side. Please try again.",
    });
    void editor.queue.commit();
    await tick();
    expect(editor.requests).toHaveLength(2);
  });

  it("puts field problems from the server on their fields", async () => {
    const editor = setup();
    editor.edit({ name: "Linen shirt 2" });
    void editor.queue.commit();
    await tick();
    await editor.requests[0]!.answer({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Please check the highlighted fields.",
        fields: { "product.variants.0.sku": "Another product already uses this SKU" },
      },
    });
    expect(editor.errors.at(-1)).toEqual([["variants.0.sku", "Another product already uses this SKU"]]);
    expect(editor.states.at(-1)).toEqual({
      status: "invalid",
      message: "Another product already uses this SKU",
    });
  });

  it("tries again when the editor picked another slug after a clash", async () => {
    const editor = setup();
    editor.onSlugTaken(() => {
      editor.edit({ slug: "linen-shirt-2" });
      return true;
    });
    editor.edit({ name: "Linen shirt new", slug: "linen-shirt-new" });
    void editor.queue.commit();
    await tick();
    await editor.requests[0]!.answer({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "This slug is already used",
        fields: { slug: "This slug is already used" },
      },
    });
    expect(editor.requests).toHaveLength(2);
    expect((editor.requests[1]!.input.product as ProductInput).slug).toBe("linen-shirt-2");
  });

  it("says so when the server can't be reached", async () => {
    const editor = setup();
    const queue = createAutosave({
      productId: PRODUCT,
      savedAt: "2026-09-30T00:00:00.000Z",
      savedValues: product(),
      getValues: () => product({ name: "Changed" }),
      send: () => Promise.reject(new Error("Failed to fetch")),
      applyPatches: () => {},
      showErrors: () => {},
      setState: (state) => editor.states.push(state),
      onSaved: () => {},
      onSlugTaken: () => false,
      isOnline: () => false,
    });
    await queue.commit();
    expect(editor.states.at(-1)).toEqual({
      status: "error",
      message: "You're offline. Check your connection and try again.",
    });
  });
});
