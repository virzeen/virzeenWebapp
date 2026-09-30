import type { FeatureLayout, FeatureRow } from "@virzeen/validators";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { FeatureFrame, FeatureGrid } from "./feature-grid";
import type { ProductFeatureView } from "./product-details-data";

type ProductFeaturesProps = {
  features: ProductFeatureView[];
  layout: FeatureLayout;
  /** The Custom layout's rows (the other layouts ignore them). */
  rows: readonly FeatureRow[];
};

/**
 * "Features that perform" (specs/product-page-v2.md): the features in the layout the owner picked (feature-grid.tsx),
 * one per row on phones; no carousel. Each is its picture, then its title and text when it has them; a feature can be
 * just the picture.
 */
export function ProductFeatures({ features, layout, rows }: ProductFeaturesProps) {
  const hasText = (feature: ProductFeatureView) => feature.title.trim() !== "" || feature.body.trim() !== "";

  return (
    <section aria-labelledby="features-heading" className="flex flex-col gap-6 pt-16 lg:pt-24">
      <h2 id="features-heading" className="font-display text-h2">
        Features that perform
      </h2>
      <FeatureGrid
        layout={layout}
        rows={rows}
        items={features}
        itemKey={(feature) => feature.id}
        tight={!features.some(hasText)}
        renderItem={(feature, tile) => (
          <div className="flex flex-1 flex-col gap-4">
            <FeatureFrame tile={tile}>
              <CloudImage
                src={feature.imageUrl || null}
                alt={feature.imageAlt}
                ratio="none"
                sizes={tile.sizes}
                className="absolute inset-0 rounded-md"
              />
            </FeatureFrame>
            {hasText(feature) && (
              <div className="flex max-w-prose flex-col gap-2">
                {feature.title.trim() !== "" && <h3 className="text-h3">{feature.title}</h3>}
                {feature.body.trim() !== "" && (
                  <p className="whitespace-pre-line text-ink-muted">{feature.body}</p>
                )}
              </div>
            )}
          </div>
        )}
      />
    </section>
  );
}
