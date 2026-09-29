"use client";

import { Button, Dialog, DialogContent, DialogTrigger } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import type { ProductDetailsData } from "./product-details-data";
import { useProductSelection } from "./product-selection";
import { galleryFor } from "./style-photos";

export type ProductDetailsDialogData = Pick<
  ProductDetailsData,
  "name" | "description" | "benefits" | "details" | "countryOfOrigin" | "care" | "images"
>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-h3">{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-6 text-ink-muted">
      {items.map((item, i) => (
        <li key={`${i}:${item}`}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * "View product details" and its popup (specs/product-page.md): the picked style's photo, the name and the price in
 * the header; the description, "Benefits", "Product details" (with the colour shown and the origin) and "Care".
 * Escape, the X and a click outside close it; focus returns to the button.
 */
export function ProductDetailsDialog({ product }: { product: ProductDetailsDialogData }) {
  const { style, colors, price } = useProductSelection();
  const photo = galleryFor(product.images, style, colors)[0];
  const colour = style ?? colors[0];
  const details = [
    ...product.details,
    ...(colour ? [`Colour shown: ${colour}`] : []),
    ...(product.countryOfOrigin ? [`Country/Region of origin: ${product.countryOfOrigin}`] : []),
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="underline" className="self-start">
          View product details
        </Button>
      </DialogTrigger>
      <DialogContent
        size="lg"
        title={product.name}
        description={<Price paisa={price.paisa} from={price.from} />}
        media={<CloudImage src={photo?.url ?? null} alt="" sizes="64px" />}
      >
        <div className="flex flex-col gap-8 text-body text-ink">
          {product.description && <p className="whitespace-pre-line">{product.description}</p>}
          {product.benefits.length > 0 && (
            <Section title="Benefits">
              <Bullets items={product.benefits} />
            </Section>
          )}
          {details.length > 0 && (
            <Section title="Product details">
              <Bullets items={details} />
            </Section>
          )}
          {product.care && (
            <Section title="Care">
              <p className="whitespace-pre-line text-ink-muted">{product.care}</p>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
