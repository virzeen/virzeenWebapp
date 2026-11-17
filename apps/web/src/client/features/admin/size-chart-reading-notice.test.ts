import { describe, expect, it } from "vitest";
import { READING_COPY, readingNotice, type ReadingSummary } from "./size-chart-reading-notice";

const CLEAN: ReadingSummary = {
  skipped: [],
  unitUnknown: false,
  blankedValues: 0,
  cutColumns: 0,
  cutRows: 0,
  multipleTables: false,
};

describe("readingNotice", () => {
  it("always asks the admin to check every number, and says nothing more when all is clear", () => {
    expect(readingNotice(CLEAN, false)).toEqual([READING_COPY.check]);
  });

  it("names the headings that were left out", () => {
    expect(readingNotice({ ...CLEAN, skipped: ["Weight", "Price"] }, false)).toContain(
      "Left out: Weight, Price.",
    );
  });

  it("says when the unit was assumed", () => {
    expect(readingNotice({ ...CLEAN, unitUnknown: true }, false)).toContain(
      "The picture doesn't show a unit, so the numbers were read as cm.",
    );
  });

  it("counts values left blank, in the singular and the plural", () => {
    expect(readingNotice({ ...CLEAN, blankedValues: 1 }, false)).toContain(
      "1 value couldn't be read and was left blank.",
    );
    expect(readingNotice({ ...CLEAN, blankedValues: 3 }, false)).toContain(
      "3 values couldn't be read and were left blank.",
    );
  });

  it("counts what the table's limits cut", () => {
    const lines = readingNotice({ ...CLEAN, cutColumns: 1, cutRows: 3 }, false);
    expect(lines).toContain("1 measurement was left out: the table holds up to 6.");
    expect(lines).toContain("3 sizes were left out: the table holds up to 20.");
  });

  it("says when only the first of several tables was read", () => {
    expect(readingNotice({ ...CLEAN, multipleTables: true }, false)).toContain(
      "The picture has more than one table. Only the first was read.",
    );
  });

  it("says when the picture's note went into Fit tips, and only then", () => {
    expect(readingNotice(CLEAN, true)).toContain("Added the picture's note to Fit tips.");
    expect(readingNotice(CLEAN, false)).not.toContain("Added the picture's note to Fit tips.");
  });
});
