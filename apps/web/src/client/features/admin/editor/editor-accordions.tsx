"use client";

import { Accordion, AccordionItem, Link } from "@virzeen/ui";
import { useState } from "react";
import { useFormState } from "react-hook-form";
import { SizeGuidePicker } from "./content-size-guide";
import { useProductEditor } from "./editor-context";

const SIZE_AND_FIT = "size-and-fit";

/**
 * The accordions under the details, as on the shop page (product-accordions.tsx): "Delivery and returns" with the
 * shop's text, and "Size and fit" with the size guide picker. The editor always shows "Size and fit" (open, so the
 * picker is in view); customers see it only when a guide is picked. It opens by itself when the guide has a problem.
 */
export function EditorAccordions() {
  const { form } = useProductEditor();
  const { errors } = useFormState({ control: form.control, name: "sizeGuideId" });
  const [open, setOpen] = useState<string[]>([SIZE_AND_FIT]);
  const value = errors.sizeGuideId && !open.includes(SIZE_AND_FIT) ? [...open, SIZE_AND_FIT] : open;

  return (
    <Accordion type="multiple" value={value} onValueChange={setOpen}>
      <AccordionItem value="delivery" title="Delivery and returns" headingLevel={2}>
        <p>
          Free delivery in 1–3 days inside Kathmandu Valley and 3–7 days elsewhere in Nepal. Free returns
          within 7 days of delivery. <Link href="/returns">Read our returns policy</Link>.
        </p>
      </AccordionItem>
      <AccordionItem value={SIZE_AND_FIT} title="Size and fit" headingLevel={2}>
        <SizeGuidePicker />
      </AccordionItem>
    </Accordion>
  );
}
