import { describe, expect, it } from "vitest";
import { editKeyAction, editLabelFor, hasChanged, normalizeDraft } from "./editable-text-keys";

describe("editing keys", () => {
  it("saves a one-line field on Enter and cancels on Escape", () => {
    expect(editKeyAction({ key: "Enter", multiline: false })).toBe("commit");
    expect(editKeyAction({ key: "Escape", multiline: false })).toBe("cancel");
    expect(editKeyAction({ key: "a", multiline: false })).toBeNull();
    expect(editKeyAction({ key: "Enter", multiline: false, shift: true })).toBeNull();
  });

  it("makes a new line on Enter in a long text, and saves on Ctrl or Cmd+Enter", () => {
    expect(editKeyAction({ key: "Enter", multiline: true })).toBeNull();
    expect(editKeyAction({ key: "Enter", multiline: true, ctrlOrMeta: true })).toBe("commit");
    expect(editKeyAction({ key: "Escape", multiline: true })).toBe("cancel");
  });

  it("leaves keys to an input method that is still composing", () => {
    expect(editKeyAction({ key: "Enter", multiline: false, composing: true })).toBeNull();
    expect(editKeyAction({ key: "Escape", multiline: false, composing: true })).toBeNull();
  });
});

describe("draft text", () => {
  it("trims the ends; a one-line field stays on one line", () => {
    expect(normalizeDraft("  Linen shirt \n", false)).toBe("Linen shirt");
    expect(normalizeDraft("Linen\r\nshirt", false)).toBe("Linen shirt");
    expect(normalizeDraft("  Line one\r\nLine two  ", true)).toBe("Line one\nLine two");
  });

  it("only counts real changes", () => {
    expect(hasChanged("Tee ", "Tee", false)).toBe(false);
    expect(hasChanged("Tee", " Tee", false)).toBe(false);
    expect(hasChanged("Top", "Tee", false)).toBe(true);
    expect(hasChanged("", "Tee", false)).toBe(true);
  });
});

describe("pencil names", () => {
  it("reads 'Edit {label}' with a lower-case first letter, keeping capitals", () => {
    expect(editLabelFor("Product name")).toBe("product name");
    expect(editLabelFor("Category")).toBe("category");
    expect(editLabelFor("SKU codes")).toBe("SKU codes");
    expect(editLabelFor("URL slug")).toBe("URL slug");
  });
});
