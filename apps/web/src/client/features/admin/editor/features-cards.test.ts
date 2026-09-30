import { productFeatureSchema } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import {
  altIsMade,
  featureAltResets,
  featureName,
  featurePartProblem,
  madeFeatureAlt,
  movedMessage,
  moveItem,
  moveKeyed,
  newFeature,
  newFeatureKey,
  partChanges,
  removeAt,
} from "./features-cards";

const feature = (title: string, alt = "") => ({ title, body: "Text", imageUrl: "virzeen/f/1", alt });

describe("feature list operations", () => {
  it("moves an item to a new place", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "c", "b"]);
  });

  it("leaves the list as it was for a place outside it", () => {
    expect(moveItem(["a", "b"], 1, 2)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });

  it("moves a card and its key together to a dropped place", () => {
    const keys = ["k1", "k2", "k3"];
    // A later card dropped on the first one's place, an earlier one on the last one's.
    expect(moveKeyed(["a", "b", "c"], keys, "k3", 0)).toEqual({
      list: ["c", "a", "b"],
      keys: ["k3", "k1", "k2"],
    });
    expect(moveKeyed(["a", "b", "c"], keys, "k1", 2)).toEqual({
      list: ["b", "c", "a"],
      keys: ["k2", "k3", "k1"],
    });
    // Move earlier on the second card: one place back.
    expect(moveKeyed(["a", "b", "c"], keys, "k2", 0)).toEqual({
      list: ["b", "a", "c"],
      keys: ["k2", "k1", "k3"],
    });
  });

  it("moves nothing when a card is dropped where it was, outside the list, or isn't known", () => {
    const keys = ["k1", "k2"];
    expect(moveKeyed(["a", "b"], keys, "k2", 1)).toBeNull();
    expect(moveKeyed(["a", "b"], keys, "k2", 2)).toBeNull();
    expect(moveKeyed(["a", "b"], keys, "k1", -1)).toBeNull();
    expect(moveKeyed(["a", "b"], keys, "k9", 0)).toBeNull();
    // Keys out of step with the list (a reload before new keys): nothing moves rather than the wrong card.
    expect(moveKeyed(["a", "b", "c"], keys, "k1", 1)).toBeNull();
  });

  it("names a card by its title, or its place, and says where a dropped one went", () => {
    expect(featureName(" Breathes ", 0)).toBe("Breathes");
    expect(featureName(" ", 2)).toBe("feature 3");
    expect(movedMessage("Breathes", 1, 5)).toBe("Moved Breathes to position 2 of 5");
  });

  it("removes one item", () => {
    expect(removeAt(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });

  it("makes a different key for every card", () => {
    expect(newFeatureKey()).not.toBe(newFeatureKey());
  });
});

describe("a new feature", () => {
  it("is only its picture: blank title, text and picture description", () => {
    expect(newFeature("virzeen/f/1")).toEqual({ imageUrl: "virzeen/f/1", title: "", body: "", alt: "" });
  });

  it("is a whole feature by the product's rules, so it saves straight away", () => {
    expect(productFeatureSchema.safeParse(newFeature("virzeen/f/1")).success).toBe(true);
    expect(featurePartProblem("imageUrl", "virzeen/f/1")).toBeNull();
    expect(featurePartProblem("imageUrl", "")).toBe("Add a picture for the feature");
  });

  it("checks a title and text with the product's rules", () => {
    // Title and text are optional (specs/product-page-v2.md).
    expect(featurePartProblem("title", "")).toBeNull();
    expect(featurePartProblem("title", "x".repeat(61))).toBe("Keep the title under 60 characters");
    expect(featurePartProblem("body", "Brushed cotton")).toBeNull();
    expect(featurePartProblem("body", "")).toBeNull();
    expect(featurePartProblem("body", "x".repeat(401))).toBe("Keep the text under 400 characters");
  });
});

describe("picture descriptions that follow the name and title", () => {
  it("knows a made description from a typed one", () => {
    expect(madeFeatureAlt(" Linen shirt ", "Breathes ")).toBe("Linen shirt, Breathes");
    expect(madeFeatureAlt(" Linen shirt ", " ")).toBe("Linen shirt");
    expect(altIsMade("Linen shirt, Breathes", "Linen shirt", "Breathes")).toBe(true);
    expect(altIsMade("", "Linen shirt", "Breathes")).toBe(true);
    expect(altIsMade("A folded shirt", "Linen shirt", "Breathes")).toBe(false);
  });

  it("makes a picture-only feature's description from the name alone", () => {
    expect(madeFeatureAlt("Linen shirt", "")).toBe("Linen shirt");
    expect(altIsMade("Linen shirt", "Linen shirt", "")).toBe(true);
    expect(altIsMade("Linen shirt, Breathes", "Linen shirt", "")).toBe(false);
  });

  it("clears a name-only description when a title is added, so the save makes it with the title", () => {
    expect(
      partChanges(0, { ...feature("", "Linen shirt"), body: "" }, "title", "Breathes", "Linen shirt"),
    ).toEqual([
      { name: "features.0.title", value: "Breathes" },
      { name: "features.0.alt", value: "" },
    ]);
  });

  it("clears a made description when the title changes, so the save makes a new one", () => {
    expect(
      partChanges(1, feature("Breathes", "Linen shirt, Breathes"), "title", "Cool", "Linen shirt"),
    ).toEqual([
      { name: "features.1.title", value: "Cool" },
      { name: "features.1.alt", value: "" },
    ]);
  });

  it("keeps a typed description and changes only the text for a new text", () => {
    expect(partChanges(0, feature("Breathes", "A folded shirt"), "title", "Cool", "Linen shirt")).toEqual([
      { name: "features.0.title", value: "Cool" },
    ]);
    expect(
      partChanges(0, feature("Breathes", "Linen shirt, Breathes"), "body", "New", "Linen shirt"),
    ).toEqual([{ name: "features.0.body", value: "New" }]);
  });

  it("clears the descriptions made from the old name on a rename", () => {
    const features = [
      feature("Breathes", "Linen shirt, Breathes"),
      feature("Soft", "Close-up"),
      feature("Dry"),
      feature("", "Linen shirt"),
    ];
    expect(featureAltResets(features, "Linen shirt")).toEqual([
      { name: "features.0.alt", value: "" },
      { name: "features.3.alt", value: "" },
    ]);
  });
});
