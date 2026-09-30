import type { ProductInput } from "@virzeen/validators";
import { EditorAccordions } from "./editor-accordions";
import { EditorBreadcrumb } from "./editor-breadcrumb";
import { EditorButtons } from "./editor-buttons";
import type { EditorOptions, EditorProduct } from "./editor-context";
import { EditorDescription } from "./editor-description";
import { EditorDetails } from "./editor-details";
import { EditorFeatures } from "./editor-features";
import { EditorGallery } from "./editor-gallery";
import { EditorHeader } from "./editor-header";
import { EditorRelated } from "./editor-related";
import { EditorSizes } from "./editor-sizes";
import { EditorStyles } from "./editor-styles";
import { EditorTopBar } from "./editor-top-bar";
import { ProductEditorProvider } from "./product-editor-provider";

type ProductEditorProps = {
  product: EditorProduct;
  /** getProductForEdit's `values`: the form starts from them. */
  values: ProductInput;
  options: EditorOptions;
};

/**
 * The product editor on the page (specs/product-editor-on-page.md): the product page as customers see it
 * (product-details.tsx, same grid and order) with everything editable in place, under a sticky top bar. From lg the
 * gallery is on the left, sticky under the bar, and the name, price, styles, sizes, buttons, description, details
 * and accordions on the right; below lg name and price, then the gallery, then the rest. Then "Features that
 * perform" and "You may also like", full width. Saves by itself after every edit.
 */
export function ProductEditor({ product, values, options }: ProductEditorProps) {
  return (
    <ProductEditorProvider product={product} values={values} options={options}>
      <div data-product-editor className="flex flex-col gap-6">
        <EditorTopBar />
        <div>
          <EditorBreadcrumb />
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:grid-rows-[auto_1fr] lg:gap-x-16">
            <EditorHeader />
            <div className="lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
              <EditorGallery />
            </div>
            <div className="flex flex-col gap-8 lg:col-start-2 lg:row-start-2 lg:max-w-md">
              <div className="flex flex-col gap-6">
                <EditorStyles />
                <EditorSizes />
                <EditorButtons />
              </div>
              <p className="text-small text-ink-muted">
                Prices include 13% VAT. Free shipping across Nepal and 7-day free returns. Pay in cash when it
                arrives.
              </p>
              <EditorDescription />
              <EditorDetails />
              <EditorAccordions />
            </div>
          </div>
          <EditorFeatures />
        </div>
        <EditorRelated />
      </div>
    </ProductEditorProvider>
  );
}
