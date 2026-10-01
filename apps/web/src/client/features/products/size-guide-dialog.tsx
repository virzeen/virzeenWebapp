"use client";

import { Button, Dialog, DialogContent, DialogTrigger } from "@virzeen/ui";
import { Ruler } from "lucide-react";
import type { SizeGuideView } from "./product-details-data";
import { SizeGuideContent } from "./size-guide-content";

/**
 * "Size guide" (ruler and text) and the popup it opens (specs/size-guides.md): next to "Select size" (or, for a
 * product without sizes, next to "Style") and inside the "Size and fit" section. A picture guide's popup shows only
 * the picture: its title and the guide's name are for screen readers (owner, 2026-10-01). Escape, the X and a click
 * outside close it; focus returns to the button.
 */
export function SizeGuideDialog({ guide }: { guide: SizeGuideView }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm">
          <Ruler className="size-4" strokeWidth={1.5} aria-hidden />
          Size guide
        </Button>
      </DialogTrigger>
      <DialogContent
        size="lg"
        title="Size guide"
        description={guide.name}
        hideTitle={guide.kind === "PICTURE"}
      >
        <SizeGuideContent guide={guide} />
      </DialogContent>
    </Dialog>
  );
}
