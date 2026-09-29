import { describe, expect, it } from "vitest";
import { errorsByPath, firstIssueUnder, formPathOf, isUnder, withChanges } from "./field-issues";

describe("withChanges", () => {
  it("sets dotted paths without changing the original", () => {
    const values = { name: "Tee", variants: [{ stock: 1 }, { stock: 2 }], tags: ["a"] };
    const next = withChanges(values, [
      { name: "variants.1.stock", value: 5 },
      { name: "name", value: "Top" },
    ]);
    expect(next).toEqual({ name: "Top", variants: [{ stock: 1 }, { stock: 5 }], tags: ["a"] });
    expect(values.variants[1]).toEqual({ stock: 2 });
    expect(next.tags).toBe(values.tags); // untouched parts are shared
  });

  it("makes the objects and lists a path needs", () => {
    expect(withChanges({}, [{ name: "images.0.alt", value: "Front" }])).toEqual({
      images: [{ alt: "Front" }],
    });
  });
});

describe("field issues", () => {
  const issues = [
    { path: ["variants", 2, "pricePaisa"], message: "Enter a price in rupees, e.g. 1250" },
    { path: ["name"], message: "Enter the product name" },
    { path: ["name"], message: "Second problem on the name" },
    { path: [], message: "Something about the whole product" },
  ];

  it("knows which paths are inside which", () => {
    expect(isUnder("variants.2.sku", "variants")).toBe(true);
    expect(isUnder("variants.2.sku", "variants.2")).toBe(true);
    expect(isUnder("variants.20.sku", "variants.2")).toBe(false);
  });

  it("finds the first problem on the edited fields only", () => {
    expect(firstIssueUnder(issues, ["variants.2.pricePaisa", "variants.3.pricePaisa"])).toBe(
      "Enter a price in rupees, e.g. 1250",
    );
    expect(firstIssueUnder(issues, ["description"])).toBeNull();
  });

  it("keeps one message per field, in order", () => {
    expect(errorsByPath(issues)).toEqual([
      ["variants.2.pricePaisa", "Enter a price in rupees, e.g. 1250"],
      ["name", "Enter the product name"],
      ["", "Something about the whole product"],
    ]);
  });

  it("reads the server's field keys as form paths", () => {
    expect(formPathOf("product.variants.0.sku")).toBe("variants.0.sku");
    expect(formPathOf("slug")).toBe("slug");
  });
});
