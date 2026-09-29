import { MAX_FAVOURITES } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import {
  addFavourite,
  applyChanges,
  hasFavourite,
  keyOf,
  parseFavourites,
  removeFavourite,
  sameFavourites,
  settleChanges,
  toKey,
  withoutFavourites,
  type FavouriteChange,
  type StoredFavourite,
} from "./favourites-store";

const SHIRT = "tz4a98xxat96iws9zmbrgj3a";
const CAP = "pfh0haxfpzowht3oi213cqos";
const AT = "2026-09-29T10:00:00.000Z";

const stored = (productId: string, color: string, savedAt = AT): StoredFavourite => ({
  productId,
  color,
  savedAt,
});

/** A full list of distinct favourites (one product, a different style each). */
const fullList = () => Array.from({ length: MAX_FAVOURITES }, (_, index) => stored(SHIRT, `Style ${index}`));

describe("guest favourites list", () => {
  it("adds at the top, keeps each style apart, and leaves a saved one where it is", () => {
    const one = addFavourite([], { productId: SHIRT, color: "White" }, AT);
    const two = addFavourite(one!, { productId: SHIRT, color: "Black" }, "2026-09-29T11:00:00.000Z");
    const again = addFavourite(two!, { productId: SHIRT, color: "White" }, "2026-09-29T12:00:00.000Z");

    expect(two).toEqual([stored(SHIRT, "Black", "2026-09-29T11:00:00.000Z"), stored(SHIRT, "White")]);
    expect(again).toEqual(two);
    expect(hasFavourite(two!, { productId: SHIRT, color: "White" })).toBe(true);
    expect(hasFavourite(two!, { productId: SHIRT, color: "" })).toBe(false);
  });

  it("stores only the product, style and time, even when given more", () => {
    const key = { productId: CAP, color: "", savedAt: "old", extra: true };

    expect(addFavourite([], key, AT)).toEqual([stored(CAP, "")]);
    expect(toKey(stored(CAP, "Red"))).toEqual({ productId: CAP, color: "Red" });
  });

  it("refuses a new favourite when the list is full, but still takes one that's saved already", () => {
    const full = fullList();

    expect(addFavourite(full, { productId: CAP, color: "" }, AT)).toBeNull();
    expect(addFavourite(full, { productId: SHIRT, color: "Style 3" }, AT)).toHaveLength(MAX_FAVOURITES);
  });

  it("removes only the given product and style", () => {
    const list = [stored(SHIRT, "White"), stored(SHIRT, "Black"), stored(CAP, "")];

    expect(removeFavourite(list, { productId: SHIRT, color: "White" })).toEqual([
      stored(SHIRT, "Black"),
      stored(CAP, ""),
    ]);
    expect(removeFavourite(list, { productId: CAP, color: "Red" })).toEqual(list);
  });

  it("leaves out every given favourite at once", () => {
    const list = [stored(SHIRT, "White"), stored(SHIRT, "Black"), stored(CAP, "")];

    expect(
      withoutFavourites(list, [
        { productId: CAP, color: "" },
        { productId: SHIRT, color: "White" },
      ]),
    ).toEqual([stored(SHIRT, "Black")]);
    expect(withoutFavourites(list, [])).toEqual(list);
  });

  it("compares two lists by product and style, not order", () => {
    const white = { productId: SHIRT, color: "White" };
    const cap = { productId: CAP, color: "" };

    expect(sameFavourites([white, cap], [cap, white])).toBe(true);
    expect(sameFavourites([white], [white, cap])).toBe(false);
    expect(sameFavourites([white, cap], [white, { productId: SHIRT, color: "Black" }])).toBe(false);
  });

  it("names a favourite by product and style", () => {
    expect(keyOf({ productId: SHIRT, color: "White" })).toBe(`${SHIRT}:White`);
    expect(keyOf({ productId: SHIRT, color: "" })).not.toBe(keyOf({ productId: SHIRT, color: "White" }));
  });
});

describe("parseFavourites", () => {
  it("reads back what was stored", () => {
    const list = [stored(SHIRT, "White"), stored(CAP, "")];

    expect(parseFavourites(JSON.stringify(list))).toEqual(list);
  });

  it("gives an empty list for nothing stored, bad JSON or something that isn't a list", () => {
    expect(parseFavourites(null)).toEqual([]);
    expect(parseFavourites("")).toEqual([]);
    expect(parseFavourites("{not json")).toEqual([]);
    expect(parseFavourites('{"productId":"x"}')).toEqual([]);
    expect(parseFavourites("42")).toEqual([]);
  });

  it("drops entries the server would refuse, and repeats", () => {
    const raw = JSON.stringify([
      stored(SHIRT, "White"),
      null,
      "text",
      { productId: "not-an-id", color: "", savedAt: AT },
      { productId: CAP, color: "x".repeat(41), savedAt: AT },
      { productId: CAP, savedAt: AT },
      { productId: CAP, color: "", savedAt: 5 },
      stored(SHIRT, "White", "2026-09-28T10:00:00.000Z"),
      { ...stored(CAP, " Red "), extra: "ignored" },
    ]);

    expect(parseFavourites(raw)).toEqual([stored(SHIRT, "White"), stored(CAP, "Red")]);
  });

  it("keeps at most the limit", () => {
    const tooMany = [...fullList(), stored(CAP, "")];

    expect(parseFavourites(JSON.stringify(tooMany))).toHaveLength(MAX_FAVOURITES);
  });
});

describe("a signed-in customer's presses being saved", () => {
  const white = { productId: SHIRT, color: "White" };
  const black = { productId: SHIRT, color: "Black" };
  const cap = { productId: CAP, color: "" };
  const changes = (...list: FavouriteChange[]) => new Map(list.map((change) => [keyOf(change.key), change]));

  it("shows new saves on top and leaves out removals", () => {
    const pending = changes(
      { key: cap, save: true, done: false },
      { key: black, save: true, done: false },
      { key: white, save: false, done: false },
    );

    expect(applyChanges([white], pending)).toEqual([black, cap]);
    expect(applyChanges([white, cap], changes({ key: cap, save: true, done: false }))).toEqual([white, cap]);
  });

  it("keeps the same list when nothing is being saved", () => {
    const keys = [white, cap];

    expect(applyChanges(keys, new Map())).toBe(keys);
  });

  it("keeps a press a fresh server list doesn't show yet, so it can't be undone by an older save", () => {
    const pending = changes({ key: white, save: false, done: false }, { key: cap, save: true, done: false });

    // The server list from an earlier save still has White and not the cap.
    expect(settleChanges(pending, [white])).toBe(pending);
    expect(applyChanges([white], settleChanges(pending, [white]))).toEqual([cap]);
  });

  it("drops presses the server list shows, and ones already saved", () => {
    const pending = changes(
      { key: white, save: false, done: false },
      { key: cap, save: true, done: true },
      { key: black, save: true, done: false },
    );

    // Still lists White: that removal is open. Black shows; the cap is saved.
    expect([...settleChanges(pending, [white, black]).keys()]).toEqual([keyOf(white)]);
    expect(settleChanges(pending, [black]).size).toBe(0);
  });
});
