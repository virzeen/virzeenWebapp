"use client";

import { Accordion, AccordionItem, Checkbox, Link, RadioGroup, RadioGroupItem } from "@virzeen/ui";
import { useListingUrl } from "./listing-url";

type ShopSidebarProps = {
  categories: { slug: string; name: string }[];
  /** The category this listing shows; none on /shop and collections. */
  activeCategory?: string | undefined;
  /** A collection or a search lists across categories, so no category is current. */
  acrossCategories: boolean;
  sizes: string[];
  colors: string[];
};

const CATEGORY_LINK =
  "flex min-h-10 items-center text-body text-ink hover:text-ink-muted aria-[current=page]:font-medium";

/**
 * The listing's filters on the left from lg, like Nike's (owner 2026-11-08): the categories as a list, then Size,
 * Colour and Availability in open sections. A choice applies at once (the URL changes; "Any" removes it).
 */
export function ShopSidebar({
  categories,
  activeCategory,
  acrossCategories,
  sizes,
  colors,
}: ShopSidebarProps) {
  const { params, navigate } = useListingUrl();
  const size = params.get("size") ?? "";
  const color = params.get("color") ?? "";
  const inStock = params.get("inStock") === "1";

  return (
    <div className="flex flex-col gap-6">
      {categories.length > 0 && (
        <nav aria-label="Categories">
          <ul className="flex flex-col">
            <li>
              <Link
                href="/shop"
                variant="subtle"
                aria-current={!activeCategory && !acrossCategories ? "page" : undefined}
                className={CATEGORY_LINK}
              >
                All products
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/shop/${category.slug}`}
                  variant="subtle"
                  aria-current={activeCategory === category.slug ? "page" : undefined}
                  className={CATEGORY_LINK}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <Accordion type="multiple" defaultValue={["size", "colour", "availability"]}>
        {sizes.length > 0 && (
          <AccordionItem value="size" title={size ? "Size (1)" : "Size"} headingLevel={2}>
            {/* "Any" (value "") removes the size: a radio can't be unticked. */}
            <RadioGroup
              variant="card"
              aria-label="Size"
              value={size}
              onValueChange={(next) => navigate({ size: next || null })}
            >
              <RadioGroupItem value="" label="Any" />
              {sizes.map((option) => (
                <RadioGroupItem key={option} value={option} label={option} />
              ))}
            </RadioGroup>
          </AccordionItem>
        )}
        {colors.length > 0 && (
          <AccordionItem value="colour" title={color ? "Colour (1)" : "Colour"} headingLevel={2}>
            <RadioGroup
              aria-label="Colour"
              value={color}
              onValueChange={(next) => navigate({ color: next || null })}
            >
              <RadioGroupItem value="" label="Any" />
              {colors.map((option) => (
                <RadioGroupItem key={option} value={option} label={option} />
              ))}
            </RadioGroup>
          </AccordionItem>
        )}
        <AccordionItem value="availability" title="Availability" headingLevel={2}>
          <Checkbox
            label="In stock only"
            checked={inStock}
            onCheckedChange={(checked) => navigate({ inStock: checked === true ? "1" : null })}
          />
        </AccordionItem>
      </Accordion>
    </div>
  );
}
