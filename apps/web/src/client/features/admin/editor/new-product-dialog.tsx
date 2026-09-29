"use client";

import { Button, Dialog, DialogClose, DialogContent, DialogTrigger } from "@virzeen/ui";
import { NewProductForm } from "./new-product-form";

/**
 * Products → "New product" (specs/product-editor-on-page.md "User flow"): a small popup with Name, Category and
 * Price; "Create draft" opens the new draft's editor.
 */
export function NewProductDialog({ categories }: { categories: { value: string; label: string }[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button shape="pill">New product</Button>
      </DialogTrigger>
      <DialogContent
        title="New product"
        description="Start with the name, category and price. You add the rest on the product page."
      >
        <NewProductForm
          categories={categories}
          cancel={
            <DialogClose asChild>
              <Button variant="secondary" shape="pill">
                Cancel
              </Button>
            </DialogClose>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
