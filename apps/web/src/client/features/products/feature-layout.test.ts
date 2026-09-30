import { FEATURE_LAYOUTS, type FeatureLayout, type FeatureRow } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import { featureSizes, featureTiles, type FeatureTile } from "./feature-layout";

type Width = "md" | "lg";
const LETTER = { portrait: "P", landscape: "L", tall: "T" } as const;

/**
 * Where the tiles land in the 12-column grid at `width`, the way CSS grid auto-placement puts them (dense when a
 * tile is pinned to the second half, as FeatureGrid does). Each grid row is one entry: its cells as
 * "{number}{shape}{span}" left to right, e.g. "1P4 2P4 3P4"; a tall tile shows in both its rows.
 */
function gridRows(tiles: FeatureTile[], width: Width): string[] {
  const dense = tiles.some((tile) => tile.md.column === "end");
  const cells: (number | undefined)[][] = [];
  const free = (row: number, col: number, span: number, rows: number) => {
    for (let r = row; r < row + rows; r++)
      for (let c = col; c < col + span; c++) if (cells[r]?.[c] !== undefined) return false;
    return true;
  };
  let cursor = { row: 0, col: 0 };
  tiles.forEach((tile, index) => {
    const { span, shape, column } = tile[width];
    const rows = shape === "tall" ? 2 : 1;
    let { row, col } = dense ? { row: 0, col: 0 } : cursor;
    if (column) {
      const start = column === "start" ? 0 : 6;
      if (!dense && start < col) row++;
      col = start;
      while (!free(row, col, span, rows)) row++;
    } else {
      while (col + span > 12 || !free(row, col, span, rows)) {
        col++;
        if (col + span > 12) {
          row++;
          col = 0;
        }
      }
    }
    for (let r = row; r < row + rows; r++)
      for (let c = col; c < col + span; c++) (cells[r] ??= [])[c] = index;
    cursor = { row, col: col + span };
  });
  return cells.map((line) => {
    // Every row is filled: no gaps from md.
    expect(Array.from({ length: 12 }, (_, col) => line[col] !== undefined)).toEqual(Array(12).fill(true));
    const shown = [...new Set(line)] as number[];
    return shown
      .map((index) => {
        const at = (tiles[index] as FeatureTile)[width];
        return `${index + 1}${LETTER[at.shape]}${at.span}`;
      })
      .join(" ");
  });
}

/** The rows without the numbers, "P4 P4 P4 / P6 P6", for layouts that read in list order. */
function shapesAt(tiles: FeatureTile[], width: Width): string {
  const rows = gridRows(tiles, width);
  // In list order: left to right, then top to bottom.
  const order = rows.flatMap((line) => line.split(" ").map((cell) => Number.parseInt(cell, 10)));
  expect(order).toEqual(tiles.map((_, index) => index + 1));
  return rows.map((line) => line.replace(/\d+(?=[PLT])/g, "")).join(" / ");
}

const phone = (tiles: FeatureTile[]) => tiles.map((tile) => LETTER[tile.phone]).join(" ");
const at = (layout: FeatureLayout, count: number, width: Width, rows: FeatureRow[] = []) =>
  shapesAt(featureTiles(layout, count, rows), width);

const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

describe("every layout", () => {
  it("gives every feature a tile, none for an empty list, and fills every row from md", () => {
    for (const layout of FEATURE_LAYOUTS) {
      expect(featureTiles(layout, 0)).toEqual([]);
      expect(featureTiles(layout, -2)).toEqual([]);
      for (const count of COUNTS) {
        const tiles = featureTiles(layout, count, [{ count: 2, shape: "PORTRAIT" }]);
        expect(tiles).toHaveLength(count);
        // gridRows checks that every row is filled.
        expect(gridRows(tiles, "md").length).toBeGreaterThan(0);
        expect(gridRows(tiles, "lg").length).toBeGreaterThan(0);
      }
    }
  });

  it("puts one picture per row on phones: 16:9 for a landscape picture, else 4:5", () => {
    for (const layout of FEATURE_LAYOUTS) {
      for (const count of COUNTS) {
        for (const tile of featureTiles(layout, count, [{ count: 1, shape: "LANDSCAPE" }])) {
          expect(tile.phone).toBe(tile.lg.shape === "landscape" ? "landscape" : "portrait");
        }
      }
    }
  });

  it("makes a tall picture tall at md and lg alike, in the same column", () => {
    for (const layout of FEATURE_LAYOUTS) {
      for (const count of COUNTS) {
        for (const tile of featureTiles(layout, count)) {
          expect(tile.md.shape === "tall").toBe(tile.lg.shape === "tall");
          expect(tile.md.column).toBe(tile.lg.column);
        }
      }
    }
  });
});

describe("Three across", () => {
  const lg: Record<number, string> = {
    1: "L12",
    2: "P6 P6",
    3: "P4 P4 P4",
    4: "P6 P6 / P6 P6",
    5: "P4 P4 P4 / P6 P6",
    6: "P4 P4 P4 / P4 P4 P4",
    7: "P4 P4 P4 / P6 P6 / P6 P6",
    8: "P4 P4 P4 / P4 P4 P4 / P6 P6",
    9: "P4 P4 P4 / P4 P4 P4 / P4 P4 P4",
  };
  const md: Record<number, string> = {
    1: "L12",
    2: "P6 P6",
    3: "P6 P6 / L12",
    4: "P6 P6 / P6 P6",
    5: "P6 P6 / P6 P6 / L12",
    6: "P6 P6 / P6 P6 / P6 P6",
    7: "P6 P6 / P6 P6 / P6 P6 / L12",
    8: "P6 P6 / P6 P6 / P6 P6 / P6 P6",
    9: "P6 P6 / P6 P6 / P6 P6 / P6 P6 / L12",
  };

  it("puts three 4:5 pictures a row from lg, never one alone (7 → 3, 2, 2; 8 → 3, 3, 2; 4 → 2, 2)", () => {
    for (const count of COUNTS) expect(at("THREE", count, "lg")).toBe(lg[count]);
  });

  it("puts two a row at md, a lone last one across the row (16:9)", () => {
    for (const count of COUNTS) expect(at("THREE", count, "md")).toBe(md[count]);
  });

  it("shows one feature alone full width, 16:9 on phones too; more are 4:5", () => {
    expect(phone(featureTiles("THREE", 1))).toBe("L");
    for (const count of COUNTS.slice(1))
      expect(phone(featureTiles("THREE", count))).toBe(Array(count).fill("P").join(" "));
  });
});

describe("Three + two", () => {
  const rows: Record<number, string> = {
    1: "L12",
    2: "L6 L6",
    3: "P4 P4 P4",
    4: "P4 P4 P4 / L12",
    5: "P4 P4 P4 / L6 L6",
    6: "P4 P4 P4 / L6 L6 / L12",
    7: "P4 P4 P4 / L6 L6 / L6 L6",
    8: "P4 P4 P4 / L6 L6 / P4 P4 P4",
    9: "P4 P4 P4 / L6 L6 / P4 P4 P4 / L12",
  };

  it("goes in groups of five from md: three 4:5, then two 16:9; the rest as the spec says", () => {
    for (const count of COUNTS) {
      expect(at("THREE_TWO", count, "md")).toBe(rows[count]);
      expect(at("THREE_TWO", count, "lg")).toBe(rows[count]);
    }
  });

  it("keeps the 16:9 pictures 16:9 on phones", () => {
    expect(phone(featureTiles("THREE_TWO", 7))).toBe("P P P L L L L");
    expect(phone(featureTiles("THREE_TWO", 9))).toBe("P P P L L P P P L");
  });
});

describe("Two across", () => {
  it("puts two 4:5 pictures a row, a lone last one full width (16:9)", () => {
    for (const count of COUNTS) {
      const pairs = Array(Math.floor(count / 2)).fill("P6 P6");
      const expected = [...pairs, ...(count % 2 === 1 ? ["L12"] : [])].join(" / ");
      expect(at("TWO", count, "md")).toBe(expected);
      expect(at("TWO", count, "lg")).toBe(expected);
    }
    expect(phone(featureTiles("TWO", 3))).toBe("P P L");
  });
});

describe("Full width", () => {
  it("puts one 16:9 picture a row everywhere", () => {
    for (const count of COUNTS) {
      const expected = Array(count).fill("L12").join(" / ");
      expect(at("FULL", count, "md")).toBe(expected);
      expect(at("FULL", count, "lg")).toBe(expected);
      expect(phone(featureTiles("FULL", count))).toBe(Array(count).fill("L").join(" "));
    }
  });
});

describe("Tall + two, Two + tall, Wide + two", () => {
  /** The rows of `count` tiles at md and lg (the same at both). */
  function rowsOf(layout: FeatureLayout, count: number) {
    const tiles = featureTiles(layout, count);
    const md = gridRows(tiles, "md");
    expect(gridRows(tiles, "lg")).toEqual(md);
    return md;
  }

  it("puts Tall + two in groups of three: a tall picture on the left, two 16:9 stacked on the right", () => {
    expect(rowsOf("TALL_LEFT", 3)).toEqual(["1T6 2L6", "1T6 3L6"]);
    expect(rowsOf("TALL_LEFT", 9)).toEqual([
      "1T6 2L6",
      "1T6 3L6",
      "4T6 5L6",
      "4T6 6L6",
      "7T6 8L6",
      "7T6 9L6",
    ]);
    expect(phone(featureTiles("TALL_LEFT", 3))).toBe("P L L");
  });

  it("puts Two + tall in groups of three: two 16:9 stacked on the left, the tall picture on the right", () => {
    expect(rowsOf("TALL_RIGHT", 3)).toEqual(["1L6 3T6", "2L6 3T6"]);
    expect(rowsOf("TALL_RIGHT", 6)).toEqual(["1L6 3T6", "2L6 3T6", "4L6 6T6", "5L6 6T6"]);
    expect(phone(featureTiles("TALL_RIGHT", 3))).toBe("L L P");
  });

  it("puts Wide + two in groups of three: one full width (16:9), then two side by side (4:5)", () => {
    expect(rowsOf("WIDE_TOP", 6)).toEqual(["1L12", "2P6 3P6", "4L12", "5P6 6P6"]);
    expect(phone(featureTiles("WIDE_TOP", 3))).toBe("L P P");
  });

  it("shows one left over full width (16:9) and two left over side by side (4:5), for 1 to 9", () => {
    const group: Record<string, string[]> = {
      TALL_LEFT: ["{1}T6 {2}L6", "{1}T6 {3}L6"],
      TALL_RIGHT: ["{1}L6 {3}T6", "{2}L6 {3}T6"],
      WIDE_TOP: ["{1}L12", "{2}P6 {3}P6"],
    };
    for (const layout of ["TALL_LEFT", "TALL_RIGHT", "WIDE_TOP"] as const) {
      for (const count of COUNTS) {
        const groups = Math.floor(count / 3);
        const expected = Array.from({ length: groups }, (_, g) =>
          (group[layout] as string[]).map((line) =>
            line.replace(/\{(\d)\}/g, (_match, n) => String(3 * g + Number(n))),
          ),
        ).flat();
        const next = 3 * groups + 1;
        if (count % 3 === 1) expected.push(`${next}L12`);
        if (count % 3 === 2) expected.push(`${next}P6 ${next + 1}P6`);
        expect(rowsOf(layout, count)).toEqual(expected);
      }
    }
  });
});

describe("Custom", () => {
  // The owner's example: "1 horizontal, 2 vertical and 4 in one row".
  const owner: FeatureRow[] = [
    { count: 1, shape: "LANDSCAPE" },
    { count: 2, shape: "PORTRAIT" },
    { count: 4, shape: "PORTRAIT" },
  ];

  it("fills the rows top to bottom; a row with fewer pictures left shares its width; more repeat the last row", () => {
    const lg: Record<number, string> = {
      1: "L12",
      2: "L12 / P12",
      3: "L12 / P6 P6",
      4: "L12 / P6 P6 / P12",
      5: "L12 / P6 P6 / P6 P6",
      6: "L12 / P6 P6 / P4 P4 P4",
      7: "L12 / P6 P6 / P3 P3 P3 P3",
      8: "L12 / P6 P6 / P3 P3 P3 P3 / P12",
      9: "L12 / P6 P6 / P3 P3 P3 P3 / P6 P6",
    };
    for (const count of COUNTS) expect(at("CUSTOM", count, "lg", owner)).toBe(lg[count]);
    expect(phone(featureTiles("CUSTOM", 7, owner))).toBe("L P P P P P P");
  });

  it("shows a row of 4 as 2 + 2 at md; fewer than 4 stay in one row", () => {
    expect(at("CUSTOM", 7, "md", owner)).toBe("L12 / P6 P6 / P6 P6 / P6 P6");
    expect(at("CUSTOM", 6, "md", owner)).toBe("L12 / P6 P6 / P4 P4 P4");
    const fours: FeatureRow[] = [{ count: 4, shape: "LANDSCAPE" }];
    expect(at("CUSTOM", 7, "lg", fours)).toBe("L3 L3 L3 L3 / L4 L4 L4");
    expect(at("CUSTOM", 7, "md", fours)).toBe("L6 L6 / L6 L6 / L4 L4 L4");
    expect(phone(featureTiles("CUSTOM", 2, fours))).toBe("L L");
  });

  it("repeats the last row's pattern for every row count and shape, 1 to 9 pictures", () => {
    for (const count of [1, 2, 3, 4] as const) {
      for (const shape of ["LANDSCAPE", "PORTRAIT"] as const) {
        const letter = shape === "LANDSCAPE" ? "L" : "P";
        for (const pictures of COUNTS) {
          const full = Math.floor(pictures / count);
          const rest = pictures % count;
          const line = (k: number) =>
            Array(k)
              .fill(`${letter}${12 / k}`)
              .join(" ");
          const lines = [...Array(full).fill(line(count)), ...(rest ? [line(rest)] : [])];
          expect(at("CUSTOM", pictures, "lg", [{ count, shape }])).toBe(lines.join(" / "));
        }
      }
    }
  });

  it("looks like Three across without rows", () => {
    for (const count of COUNTS) {
      expect(featureTiles("CUSTOM", count, [])).toEqual(featureTiles("THREE", count));
      expect(featureTiles("CUSTOM", count)).toEqual(featureTiles("THREE", count));
    }
  });

  it("ignores the rows in the other layouts", () => {
    for (const layout of FEATURE_LAYOUTS.filter((layout) => layout !== "CUSTOM")) {
      expect(featureTiles(layout, 7, owner)).toEqual(featureTiles(layout, 7));
    }
  });

  it("reads a row count outside 1 to 4 as the nearest one, so it always ends", () => {
    const odd = [{ count: 0, shape: "PORTRAIT" }] as FeatureRow[];
    expect(at("CUSTOM", 3, "lg", odd)).toBe("P12 / P12 / P12");
    const big = [{ count: 9, shape: "LANDSCAPE" }] as FeatureRow[];
    expect(at("CUSTOM", 5, "lg", big)).toBe("L3 L3 L3 L3 / L12");
  });
});

describe("featureSizes", () => {
  it("asks for the picture's widest width at each screen width", () => {
    const [lone] = featureTiles("THREE", 1);
    expect(featureSizes(lone as FeatureTile)).toBe(
      "(min-width: 1280px) 1280px, (min-width: 1024px) 100vw, (min-width: 768px) 100vw, 100vw",
    );
    const last = featureTiles("THREE", 3)[2] as FeatureTile;
    expect(featureSizes(last)).toBe(
      "(min-width: 1280px) 427px, (min-width: 1024px) 33vw, (min-width: 768px) 100vw, 100vw",
    );
    const quarter = featureTiles("CUSTOM", 4, [{ count: 4, shape: "PORTRAIT" }])[0] as FeatureTile;
    expect(featureSizes(quarter)).toBe(
      "(min-width: 1280px) 320px, (min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw",
    );
  });
});
