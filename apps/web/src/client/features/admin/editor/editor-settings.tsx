"use client";

import { Button, ButtonLink, Sheet, SheetContent, SheetTrigger } from "@virzeen/ui";
import { Settings2 } from "lucide-react";
import { useWatch } from "react-hook-form";
import { ArchiveButton } from "../archive-button";
import { DuplicateProductButton } from "../duplicate-product-button";
import { useProductEditor } from "./editor-context";
import { SettingsCollections, SettingsSearch } from "./editor-settings-fields";
import { SettingsRows } from "./editor-settings-rows";

/**
 * Settings (specs/product-editor-on-page.md "Top bar"): what isn't on the product page. A sheet from the right with
 * the URL slug and search description, collections, per-size prices and SKU codes, then View in shop, Duplicate and
 * Archive. Every field saves when it's left, like the page.
 */
export function EditorSettings() {
  const { form, product, save } = useProductEditor();
  const name = useWatch({ control: form.control, name: "name" });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" shape="pill">
          <Settings2 className="size-4" strokeWidth={1.5} aria-hidden />
          Settings
        </Button>
      </SheetTrigger>
      <SheetContent title="Settings" description="The parts of the product that aren't on its page.">
        <div className="flex flex-col gap-8">
          <SettingsSearch />
          <SettingsCollections />
          <SettingsRows />
          <section aria-labelledby="settings-product-heading" className="flex flex-col gap-3">
            <h3 id="settings-product-heading" className="text-body font-medium">
              Product
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {product.isPublished && (
                <ButtonLink
                  href={`/product/${product.slug}`}
                  target="_blank"
                  variant="ghost"
                  size="sm"
                  shape="pill"
                >
                  View in shop
                </ButtonLink>
              )}
              <DuplicateProductButton id={product.id} unsaved={save.status !== "saved"} />
              <ArchiveButton kind="product" id={product.id} name={name} redirectTo="/admin/products" />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
