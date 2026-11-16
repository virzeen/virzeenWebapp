import { describe, expect, it } from "vitest";
import { currentHref, firstName, greetingFor, isCurrent } from "./nav-current";

describe("isCurrent", () => {
  it("matches the link's page and the pages under it", () => {
    expect(isCurrent("/portfolio", "/portfolio")).toBe(true);
    expect(isCurrent("/portfolio/light-studies", "/portfolio")).toBe(true);
    expect(isCurrent("/portfolios", "/portfolio")).toBe(false);
  });

  it("marks Home only on the home page", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/shop", "/")).toBe(false);
  });
});

describe("currentHref", () => {
  const menu = ["/", "/shop", "/collections/tops", "/portfolio", "/about", "/account", "/account/orders"];

  it("picks the most specific match", () => {
    expect(currentHref("/collections/tops", menu)).toBe("/collections/tops");
    expect(currentHref("/shop", menu)).toBe("/shop");
    expect(currentHref("/account/orders/VZ-1001", menu)).toBe("/account/orders");
    expect(currentHref("/account/addresses", menu)).toBe("/account");
    expect(currentHref("/", menu)).toBe("/");
  });

  it("is undefined when no link matches", () => {
    expect(currentHref("/product/linen-overshirt", menu)).toBeUndefined();
  });
});

describe("firstName", () => {
  it("is the first word of the account name", () => {
    expect(firstName("Asha Gurung")).toBe("Asha");
    expect(firstName("  Bikash  ")).toBe("Bikash");
  });

  it("is null without a name", () => {
    expect(firstName("")).toBeNull();
    expect(firstName("   ")).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});

describe("greetingFor", () => {
  it("greets by first name", () => {
    expect(greetingFor("Asha")).toBe("Hi, Asha");
  });

  it("says Hi there while the account has no name", () => {
    expect(greetingFor(firstName(""))).toBe("Hi there");
    expect(greetingFor(firstName(null))).toBe("Hi there");
    expect(greetingFor(null)).toBe("Hi there");
  });
});
