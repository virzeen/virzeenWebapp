// Size guide units (specs/size-guides.md): charts are typed in cm; inches are worked out for the "in" view.

export type SizeUnit = "cm" | "in";

const STORAGE_KEY = "virzeen:size-guide-unit";

/** One cm value in inches, rounded to the nearest 0.5: "96" → "38", "100" → "39.5". */
const inches = (cm: string) => String(Math.round((Number(cm) / 2.54) * 2) / 2);

// A number ("96", "96.5") or a range ("96-101", "96 – 101"), anywhere in the text.
const AMOUNT = /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/g;

/**
 * A chart value in inches: numbers and ranges converted ("96-101" → "38 - 40", "Up to 80" → "Up to 31.5"),
 * anything else as typed ("Free").
 */
export const toInches = (value: string) =>
  value.replace(AMOUNT, (_, from: string, to: string | undefined) =>
    to === undefined ? inches(from) : `${inches(from)} - ${inches(to)}`,
  );

/** The unit picked earlier in this visit; cm when none (or the browser blocks storage). */
export function readSizeUnit(): SizeUnit {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "in" ? "in" : "cm";
  } catch {
    return "cm";
  }
}

export function writeSizeUnit(unit: SizeUnit) {
  try {
    sessionStorage.setItem(STORAGE_KEY, unit);
  } catch {
    // Storage blocked: the choice lasts until the popup closes.
  }
}
