import { Accordion, AccordionItem, Link } from "@virzeen/ui";
import type { SizeGuideView } from "./product-details-data";
import { SizeGuideDialog } from "./size-guide-dialog";

/**
 * "Delivery and returns" and, when the product has a size guide, "Size and fit" (specs/product-page.md). Level-2
 * headings: they sit right under the page's h1 in the outline.
 */
export function ProductAccordions({ sizeGuide }: { sizeGuide: SizeGuideView | null }) {
  return (
    <Accordion type="multiple">
      <AccordionItem value="delivery" title="Delivery and returns" headingLevel={2}>
        <p>
          Free delivery in 1–3 days inside Kathmandu Valley and 3–7 days elsewhere in Nepal. Free returns
          within 7 days of delivery. <Link href="/returns">Read our returns policy</Link>.
        </p>
      </AccordionItem>
      {sizeGuide && (
        <AccordionItem value="size-and-fit" title="Size and fit" headingLevel={2}>
          <div className="flex flex-col items-start gap-2">
            {sizeGuide.fitTips && <p className="whitespace-pre-line">{sizeGuide.fitTips}</p>}
            <SizeGuideDialog guide={sizeGuide} />
          </div>
        </AccordionItem>
      )}
    </Accordion>
  );
}
