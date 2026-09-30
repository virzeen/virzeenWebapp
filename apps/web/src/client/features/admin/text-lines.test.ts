import { describe, expect, it } from "vitest";
import { linesError, sameLines, toLines } from "./text-lines";

describe("one-per-line text boxes", () => {
  it("keeps the lines that aren't blank, trimmed", () => {
    expect(toLines("  Soft cotton \n\n Pre-washed\n   \n")).toEqual(["Soft cotton", "Pre-washed"]);
    expect(toLines("")).toEqual([]);
  });

  it("compares lists line by line", () => {
    expect(sameLines(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameLines(["a", "b"], ["a"])).toBe(false);
    expect(sameLines(["a", "b"], ["b", "a"])).toBe(false);
  });

  it("shows the list's own error first", () => {
    expect(linesError({ message: "Add up to 12 benefits" }, "")).toBe("Add up to 12 benefits");
    expect(linesError({ root: { message: "Add up to 12 benefits" } }, "")).toBe("Add up to 12 benefits");
    expect(linesError(undefined, "")).toBeUndefined();
  });

  it("names the line of a line's error as it is in the box, blank lines included", () => {
    const error = [undefined, { message: "Keep each line under 200 characters" }];
    expect(linesError(error, "First\n\nSecond")).toBe("Line 3: Keep each line under 200 characters");
  });
});
