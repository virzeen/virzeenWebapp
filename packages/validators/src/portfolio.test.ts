import { describe, expect, it } from "vitest";
import { PORTFOLIO_KIND_LABELS, PORTFOLIO_KINDS, portfolioProjectSchema } from "./portfolio";

const project = {
  title: "Light studies",
  slug: "light-studies",
  kind: "LOOKBOOK",
  summary: "Linen in morning light.",
  coverUrl: "virzeen/portfolio/light/cover",
  coverAlt: "Model in a linen overshirt by a window",
  body: [],
  productIds: [],
  isPublished: true,
  sortOrder: 0,
};

/** Field path → first message, the way the admin form shows them. */
function errorsOf(input: unknown) {
  const result = portfolioProjectSchema.safeParse(input);
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

describe("portfolioProjectSchema messages", () => {
  it("accepts a valid project", () => {
    expect(portfolioProjectSchema.safeParse(project).success).toBe(true);
  });

  it("names the empty text and alt text of each story block", () => {
    const errors = errorsOf({
      ...project,
      body: [
        { type: "text", heading: "", text: "  " },
        { type: "image", url: "virzeen/portfolio/light/one", alt: "", caption: "", layout: "full" },
      ],
    });
    expect(errors).toEqual({
      "body.0.text": "Write the text for this block",
      "body.1.alt": "Describe the image for screen readers",
    });
  });

  it("says what to enter for a blank slug and order", () => {
    expect(errorsOf({ ...project, slug: "", sortOrder: Number.NaN })).toEqual({
      slug: "Enter a URL slug",
      sortOrder: "Enter a whole number from 0 to 1,000",
    });
  });

  it("explains an image reference that is a web address", () => {
    expect(errorsOf({ ...project, coverUrl: "https://example.com/cover.jpg" })).toEqual({
      coverUrl: "Use a Cloudinary public id or a /public path, not a web address",
    });
  });
});

describe("PORTFOLIO_KIND_LABELS", () => {
  it("has a label for every kind", () => {
    expect(Object.keys(PORTFOLIO_KIND_LABELS).sort()).toEqual([...PORTFOLIO_KINDS].sort());
    expect(PORTFOLIO_KIND_LABELS.COLLABORATION).toBe("Collaboration");
  });
});
