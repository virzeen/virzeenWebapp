import type { SizeGuideFormValues } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import { toSizeGuideView } from "./size-guide-view";

const values: SizeGuideFormValues = {
  kind: "CHART",
  name: " T-shirts ",
  intro: "",
  chart: {
    columns: ["Chest", " "],
    rows: [
      { size: " M ", values: [" 96 ", "72"] },
      { size: "L", values: ["102"] },
    ],
  },
  fitTips: " Relaxed fit. ",
  howToMeasure: ["Around the chest", " "],
  imageUrl: "",
  imageAlt: "",
};

describe("toSizeGuideView", () => {
  it("shows a Clothing guide's table as typed, blank measurements named by their place", () => {
    expect(toSizeGuideView(values)).toEqual({
      kind: "CHART",
      name: "T-shirts",
      intro: null,
      chart: {
        columns: ["Chest", "Measurement 2"],
        rows: [
          { size: "M", values: ["96", "72"] },
          { size: "L", values: ["102", ""] },
        ],
      },
      fitTips: "Relaxed fit.",
      howToMeasure: ["Around the chest"],
      imageUrl: null,
      imageAlt: null,
    });
  });

  it("shows an Accessories guide's picture and no table, even with a table kept from before", () => {
    const view = toSizeGuideView({
      ...values,
      kind: "PICTURE",
      imageUrl: "size-guides/rings",
      imageAlt: " Ring sizes ",
    });
    expect(view.kind).toBe("PICTURE");
    expect(view.chart).toBeNull();
    expect(view.imageUrl).toBe("size-guides/rings");
    expect(view.imageAlt).toBe("Ring sizes");
  });
});
