import { describe, expect, it } from "vitest";
import { closestShape, UNKNOWN_SHAPE } from "./picture-shape";

describe("closestShape", () => {
  it("gives the shape of a picture that matches one exactly", () => {
    expect(closestShape(1080, 1920)).toBe("aspect-9/16");
    expect(closestShape(1600, 800)).toBe("aspect-2/1");
    expect(closestShape(1200, 1200)).toBe("aspect-square");
    expect(closestShape(1200, 800)).toBe("aspect-3/2");
    expect(closestShape(800, 1000)).toBe("aspect-4/5");
  });

  it("gives the closest shape for any other picture", () => {
    // A phone screenshot a little taller than 9:16, and a very wide table.
    expect(closestShape(1080, 2340)).toBe("aspect-9/16");
    expect(closestShape(3000, 1000)).toBe("aspect-2/1");
    // 1.25:1 sits between 4:3 and square, nearer 4:3.
    expect(closestShape(1250, 1000)).toBe("aspect-4/3");
  });

  it("keeps the starting shape while the size isn't known", () => {
    expect(closestShape(0, 0)).toBe(UNKNOWN_SHAPE);
    expect(closestShape(800, 0)).toBe(UNKNOWN_SHAPE);
    expect(closestShape(Number.NaN, 600)).toBe(UNKNOWN_SHAPE);
  });
});
