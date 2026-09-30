"use client";

import { Button, Stack } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { useId } from "react";

/**
 * Add to bag and Favourite as on the shop page (product-purchase.tsx, favourite-button.tsx), but inert: the editor
 * shows where they sit, and a note says customers use them (specs/product-editor-on-page.md). Not the phone's
 * sticky bar: that's for customers.
 */
export function EditorButtons() {
  const noteId = useId();
  return (
    <Stack gap={3}>
      <Button size="lg" shape="pill" className="w-full" disabled aria-describedby={noteId}>
        Add to bag
      </Button>
      <Button
        variant="secondary"
        size="lg"
        shape="pill"
        className="w-full"
        disabled
        aria-describedby={noteId}
      >
        <Heart className="size-5" strokeWidth={1.5} aria-hidden />
        Favourite
      </Button>
      <p id={noteId} className="text-small text-ink-muted">
        Customers use these buttons.
      </p>
    </Stack>
  );
}
