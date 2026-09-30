import { describe, expect, it } from "vitest";
import { nextSlug, slugFollowsName, slugForName } from "./editor-slug";

describe("slug that follows the name", () => {
  it("knows a slug made from the name, with or without a number added", () => {
    expect(slugFollowsName("linen-shirt", "Linen shirt")).toBe(true);
    expect(slugFollowsName("linen-shirt-2", "Linen shirt")).toBe(true);
    expect(slugFollowsName("summer-linen", "Linen shirt")).toBe(false);
    expect(slugFollowsName("linen-shirt-black", "Linen shirt")).toBe(false);
    expect(slugFollowsName("product", "नेपाली")).toBe(false);
  });

  it("keeps the current slug when nothing usable is left of the name", () => {
    expect(slugForName("Summer tee", "linen-shirt")).toBe("summer-tee");
    expect(slugForName("!!!", "linen-shirt")).toBe("linen-shirt");
  });

  it("tries the next number when a slug is taken", () => {
    expect(nextSlug("tee", "Tee")).toBe("tee-2");
    expect(nextSlug("tee-2", "Tee")).toBe("tee-3");
    expect(nextSlug("summer-2026", "Summer 2026")).toBe("summer-2026-2");
  });
});
