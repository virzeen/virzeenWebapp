import { describe, expect, it } from "vitest";
import {
  altIsMade,
  featureAltResets,
  featurePartProblem,
  isComplete,
  madeFeatureAlt,
  moveItem,
  newFeatureKey,
  partChanges,
  removeAt,
  toFeature,
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

  it("removes one item", () => {
    expect(removeAt(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });

  it("makes a different key for every card", () => {
    expect(newFeatureKey()).not.toBe(newFeatureKey());
  });
});

describe("a new feature", () => {
  it("is complete with a picture, a title and text", () => {
    expect(isComplete({ imageUrl: "virzeen/f/1", title: "Soft", body: "Brushed cotton" })).toBe(true);
    expect(isComplete({ imageUrl: "virzeen/f/1", title: " ", body: "Brushed cotton" })).toBe(false);
    expect(isComplete({ imageUrl: "", title: "Soft", body: "Brushed cotton" })).toBe(false);
  });

  it("goes into the form with a blank picture description", () => {
    expect(toFeature({ key: "k", imageUrl: "virzeen/f/1", title: "Soft", body: "Text" })).toEqual({
      imageUrl: "virzeen/f/1",
      title: "Soft",
      body: "Text",
      alt: "",
    });
  });

  it("checks a title and text with the product's rules", () => {
    expect(featurePartProblem("title", "")).toBe("Enter a title for the feature");
    expect(featurePartProblem("title", "x".repeat(61))).toBe("Keep the title under 60 characters");
    expect(featurePartProblem("body", "Brushed cotton")).toBeNull();
  });
});

describe("picture descriptions that follow the name and title", () => {
  it("knows a made description from a typed one", () => {
    expect(madeFeatureAlt(" Linen shirt ", "Breathes ")).toBe("Linen shirt, Breathes");
    expect(altIsMade("Linen shirt, Breathes", "Linen shirt", "Breathes")).toBe(true);
    expect(altIsMade("", "Linen shirt", "Breathes")).toBe(true);
    expect(altIsMade("A folded shirt", "Linen shirt", "Breathes")).toBe(false);
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
    ];
    expect(featureAltResets(features, "Linen shirt")).toEqual([{ name: "features.0.alt", value: "" }]);
  });
});
