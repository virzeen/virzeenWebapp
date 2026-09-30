import { describe, expect, it } from "vitest";
import { rowEdges } from "./product-carousel-scroll";

describe("rowEdges", () => {
  it("is at both ends when every card fits", () => {
    expect(rowEdges({ scrollLeft: 0, clientWidth: 1200, scrollWidth: 1200 })).toEqual({
      start: true,
      end: true,
    });
  });

  it("is at the start before scrolling and in the middle after", () => {
    expect(rowEdges({ scrollLeft: 0, clientWidth: 1200, scrollWidth: 2400 })).toEqual({
      start: true,
      end: false,
    });
    expect(rowEdges({ scrollLeft: 600, clientWidth: 1200, scrollWidth: 2400 })).toEqual({
      start: false,
      end: false,
    });
  });

  it("is at the end when scrolled all the way, allowing a fractional pixel", () => {
    expect(rowEdges({ scrollLeft: 1200, clientWidth: 1200, scrollWidth: 2400 })).toEqual({
      start: false,
      end: true,
    });
    expect(rowEdges({ scrollLeft: 1199.5, clientWidth: 1200, scrollWidth: 2400 }).end).toBe(true);
    expect(rowEdges({ scrollLeft: 0.5, clientWidth: 1200, scrollWidth: 2400 }).start).toBe(true);
  });
});
