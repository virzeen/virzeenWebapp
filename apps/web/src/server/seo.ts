import { formatPaisa } from "@/client/components/shared/price";
import { SITE } from "@/client/lib/site";

// Search titles, descriptions and structured data (owner request 2026-09-30, performance-seo.md §3).
// Every page names the brand and what's sold ("Vases by Virzeen"), so searches for "virzeen" or for a product type
// with the brand find the shop. Descriptions are written from the product itself unless the owner typed one.

/** Google shows about this many characters of a description. */
const DESCRIPTION_LENGTH = 160;
const PROMISE = "Free shipping across Nepal. Cash on delivery.";

export const HOME_TITLE = "Virzeen | Monochrome, black & white fashion from Nepal";
export const HOME_DESCRIPTION =
  "Virzeen is a monochrome fashion label from Nepal: black and white, aesthetic pieces for everyday. Free shipping across Nepal and cash on delivery.";
export const SHOP_TITLE = "Shop Virzeen | Monochrome, black & white fashion in Nepal";

/** "Vases by Virzeen" */
export const categoryTitle = (category: string) => `${category} by Virzeen`;

/** "Linen Overshirt | Tops by Virzeen" */
export const productTitle = (product: string, category: string) => `${product} | ${category} by Virzeen`;

/** "Monsoon collection by Virzeen" (no doubled word when the name already ends in "collection"). */
export const collectionTitle = (collection: string) =>
  /\bcollection$/i.test(collection) ? `${collection} by Virzeen` : `${collection} collection by Virzeen`;

/** Text on one line, cut at a word to fit `max` characters (with "…" when cut). */
export function fit(text: string, max: number) {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

export function categoryDescription(category: string) {
  return fit(
    `Shop ${category.toLowerCase()} by Virzeen: monochrome, black and white pieces from Nepal. ${PROMISE}`,
    DESCRIPTION_LENGTH,
  );
}

/**
 * The owner's search description when there is one. Otherwise the start of the product description, then the
 * price ("From" when sizes or styles differ) and the delivery promise.
 */
export function productDescription(product: {
  seoDescription: string | null;
  description: string;
  lowestPaisa: number;
  highestPaisa: number;
}) {
  const typed = product.seoDescription?.trim();
  if (typed) return fit(typed, DESCRIPTION_LENGTH);
  const price = `${product.highestPaisa > product.lowestPaisa ? "From " : ""}${formatPaisa(product.lowestPaisa)}.`;
  const tail = ` ${price} ${PROMISE}`;
  const start = fit(product.description, DESCRIPTION_LENGTH - tail.length);
  return `${/[.!?…]$/.test(start) || !start ? start : `${start}.`}${tail}`.trim();
}

/**
 * A full https URL for an image reference, for link previews and search: Cloudinary public ids become a
 * 1200px JPEG (every preview crawler can read JPEG), /public paths get the site's address.
 */
export function absoluteImageUrl(src: string, siteUrl: string) {
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/")) return `${siteUrl}${src}`;
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return cloud ? `https://res.cloudinary.com/${cloud}/image/upload/f_jpg,q_auto,c_limit,w_1200/${src}` : null;
}

/** The brand for Google: who sells (Organization, with the logo) and the site's name (WebSite). Home page only. */
export function siteJsonLd(siteUrl: string) {
  const organization = `${siteUrl}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organization,
        name: SITE.name,
        url: `${siteUrl}/`,
        logo: { "@type": "ImageObject", url: `${siteUrl}/icons/icon-512.png`, width: 512, height: 512 },
        description: HOME_DESCRIPTION,
        email: SITE.infoEmail,
        sameAs: [SITE.instagram],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          email: SITE.salesEmail,
          areaServed: "NP",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: SITE.name,
        alternateName: ["Virzeen Nepal", "virzeen.com"],
        url: `${siteUrl}/`,
        inLanguage: "en-NP",
        publisher: { "@id": organization },
      },
    ],
  };
}

/** Home › Shop › Tops › Linen Overshirt, as Google shows it under a result. */
export function breadcrumbJsonLd(siteUrl: string, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}
