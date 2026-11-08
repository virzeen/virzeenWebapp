import { describe, expect, it } from "vitest";
import { SEARCH_MAX_WORDS, searchWhere, searchWords } from "./search";

describe("searchWords", () => {
  it("lower-cases the query and splits it on any spaces", () => {
    expect(searchWords("  Black   TEE ")).toEqual([["black"], ["tee"]]);
  });

  it("lets a plural over 3 letters match without its s", () => {
    expect(searchWords("tops tees bus")).toEqual([["tops", "top"], ["tees", "tee"], ["bus"]]);
  });

  it("drops % _ and \\ so they match nothing special", () => {
    expect(searchWords("50% lin_en \\")).toEqual([["50"], ["linen"]]);
  });

  it(`keeps only the first ${SEARCH_MAX_WORDS} words`, () => {
    expect(searchWords("a b c d e f g").flat()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("finds no words in a query of only spaces or dropped characters", () => {
    expect(searchWords("   ")).toEqual([]);
    expect(searchWhere("% _")).toBeNull();
  });
});
