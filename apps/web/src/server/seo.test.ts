import { describe, expect, it } from "vitest";
import {
  breadcrumbJsonLd,
  categoryDescription,
  categoryTitle,
  collectionTitle,
  fit,
  productDescription,
  productTitle,
} from "./seo";

describe("search titles", () => {
  it("names the brand with what's sold", () => {
    expect(categoryTitle("Vases")).toBe("Vases by Virzeen");
    expect(productTitle("Linen Overshirt", "Tops")).toBe("Linen Overshirt | Tops by Virzeen");
    expect(collectionTitle("Monsoon")).toBe("Monsoon collection by Virzeen");
    expect(collectionTitle("Winter Collection")).toBe("Winter Collection by Virzeen");
  });
});

describe("search descriptions", () => {
  it("uses the owner's text when there is one", () => {
    expect(
      productDescription({
        seoDescription: "  Hand-thrown black vase.  ",
        description: "x",
        lowestPaisa: 1,
        highestPaisa: 1,
      }),
    ).toBe("Hand-thrown black vase.");
  });

  it("otherwise writes one from the product: its start, the price and the delivery promise, within 160", () => {
    const text = productDescription({
      seoDescription: null,
      description:
        "A relaxed overshirt in washed linen,\n\ncut long with a hidden placket and horn buttons. ".repeat(3),
      lowestPaisa: 350_000,
      highestPaisa: 420_000,
    });
    expect(text.length).toBeLessThanOrEqual(160);
    expect(text).toMatch(/^A relaxed overshirt in washed linen, cut long/);
    expect(text).toContain("… From Rs 3,500. Free shipping across Nepal. Cash on delivery.");
  });

  it("drops 'From' when every size costs the same", () => {
    const text = productDescription({
      seoDescription: null,
      description: "Black vase",
      lowestPaisa: 150_000,
      highestPaisa: 150_000,
    });
    expect(text).toBe("Black vase. Rs 1,500. Free shipping across Nepal. Cash on delivery.");
  });

  it("describes a category", () => {
    expect(categoryDescription("Vases")).toBe(
      "Shop vases by Virzeen: monochrome, black and white pieces from Nepal. Free shipping across Nepal. Cash on delivery.",
    );
  });

  it("cuts at a word", () => {
    expect(fit("monochrome black and white", 20)).toBe("monochrome black…");
  });
});

describe("breadcrumbs", () => {
  it("starts at Home and uses full URLs", () => {
    const data = breadcrumbJsonLd("https://virzeen.com", [
      { name: "Shop", path: "/shop" },
      { name: "Vases", path: "/shop/vases" },
    ]);
    expect(data.itemListElement.map((item) => [item.position, item.name, item.item])).toEqual([
      [1, "Home", "https://virzeen.com/"],
      [2, "Shop", "https://virzeen.com/shop"],
      [3, "Vases", "https://virzeen.com/shop/vases"],
    ]);
  });
});
