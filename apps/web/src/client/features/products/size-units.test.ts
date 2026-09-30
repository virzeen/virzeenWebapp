import { afterEach, describe, expect, it, vi } from "vitest";
import { readSizeUnit, toInches, writeSizeUnit } from "./size-units";

describe("size guide units (specs/size-guides.md)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("converts cm to inches, rounded to the nearest 0.5", () => {
    expect(toInches("96")).toBe("38");
    expect(toInches("100")).toBe("39.5");
    expect(toInches("72.5")).toBe("28.5");
    expect(toInches("0")).toBe("0");
  });

  it("converts ranges and numbers inside text, and keeps anything else", () => {
    expect(toInches("96-101")).toBe("38 - 40");
    expect(toInches("94 – 100")).toBe("37 - 39.5");
    expect(toInches("Up to 80")).toBe("Up to 31.5");
    expect(toInches("Free")).toBe("Free");
    expect(toInches("")).toBe("");
  });

  it("remembers the unit for the visit, and falls back to cm", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
    expect(readSizeUnit()).toBe("cm");
    writeSizeUnit("in");
    expect(readSizeUnit()).toBe("in");

    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(readSizeUnit()).toBe("cm");
    expect(() => writeSizeUnit("in")).not.toThrow();
  });
});
