import { describe, expect, it } from "vitest";
import { isSafeNoticeHref, siteNoticeSchema } from "./notices";

const valid = {
  text: "11.11 offers are live.",
  linkLabel: "Shop now",
  linkHref: "/shop",
  audiences: ["GUEST"],
  startsOn: "",
  endsOn: "",
  isActive: true,
} as const;

const firstMessage = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("isSafeNoticeHref", () => {
  it("allows site pages and https links", () => {
    expect(isSafeNoticeHref("/membership")).toBe(true);
    expect(isSafeNoticeHref("https://virzeen.com/shop")).toBe(true);
  });

  it("refuses script, data, plain http and look-alike addresses", () => {
    for (const href of [
      "javascript:alert(1)",
      "data:text/html,x",
      "http://virzeen.com",
      "//evil.com",
      "/\\evil.com",
      "https://",
    ]) {
      expect(isSafeNoticeHref(href), href).toBe(false);
    }
  });
});

describe("siteNoticeSchema", () => {
  it("accepts a notice with a link", () => {
    expect(siteNoticeSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a notice without a link", () => {
    expect(siteNoticeSchema.safeParse({ ...valid, linkLabel: "", linkHref: "" }).success).toBe(true);
  });

  it("asks for the other half of a link", () => {
    expect(firstMessage(siteNoticeSchema.safeParse({ ...valid, linkHref: "" }))).toBe(
      "Add the link this should open",
    );
    expect(firstMessage(siteNoticeSchema.safeParse({ ...valid, linkLabel: "" }))).toBe(
      "Add the words people tap",
    );
  });

  it("rejects an unsafe link, empty or overlong text, no audience and an end before the start", () => {
    expect(siteNoticeSchema.safeParse({ ...valid, linkHref: "javascript:alert(1)" }).success).toBe(false);
    expect(siteNoticeSchema.safeParse({ ...valid, text: "  " }).success).toBe(false);
    expect(siteNoticeSchema.safeParse({ ...valid, text: "x".repeat(91) }).success).toBe(false);
    expect(siteNoticeSchema.safeParse({ ...valid, audiences: [] }).success).toBe(false);
    expect(
      siteNoticeSchema.safeParse({ ...valid, startsOn: "2026-11-12", endsOn: "2026-11-11" }).success,
    ).toBe(false);
  });

  it("rejects fields it does not know", () => {
    expect(siteNoticeSchema.safeParse({ ...valid, sortOrder: 1 }).success).toBe(false);
  });
});
