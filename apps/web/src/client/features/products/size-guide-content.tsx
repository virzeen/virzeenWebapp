"use client";

import { cn, Link } from "@virzeen/ui";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import imageLoader from "@/client/lib/image-loader";
import { closestShape, UNKNOWN_SHAPE } from "./picture-shape";
import type { SizeGuideView } from "./product-details-data";
import { SizeGuideTable } from "./size-guide-table";

type SizeGuideContentProps = {
  guide: SizeGuideView;
  /** Remember the cm/in choice for the visit (the shop's popup). The admin preview starts in cm and forgets it. */
  remember?: boolean;
  /** Shown where an Accessories guide's picture goes while it has none (the admin preview). */
  picturePlaceholder?: React.ReactNode;
};

/**
 * The whole size chart picture across the popup's width, and a link to it at full size in a new tab (Accessories).
 * Its box takes the closest shape to the picture's own once it has loaded (square until then), so a tall phone
 * screenshot or a wide table fills the width instead of sitting small in a square.
 */
function SizeChartPicture({ guide, src }: { guide: SizeGuideView; src: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [shape, setShape] = useState(UNKNOWN_SHAPE);

  useEffect(() => {
    const picture = boxRef.current?.querySelector("img");
    if (!picture) return;
    const measure = () => setShape(closestShape(picture.naturalWidth, picture.naturalHeight));
    picture.addEventListener("load", measure);
    // Already loaded (e.g. from the cache) before this ran, so its load event has gone.
    const frame = picture.complete ? requestAnimationFrame(measure) : 0;
    return () => {
      picture.removeEventListener("load", measure);
      cancelAnimationFrame(frame);
    };
  }, [src]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={boxRef}>
        <CloudImage
          src={src}
          alt={guide.imageAlt?.trim() || `${guide.name} size chart`.trim()}
          ratio="none"
          sizes="(min-width: 640px) 40rem, 100vw"
          className={cn("w-full rounded-md", shape)}
          imageClassName="object-contain"
        />
      </div>
      <Link
        href={imageLoader({ src, width: 1600 })}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 self-end text-small"
      >
        Open full size
        <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </Link>
    </div>
  );
}

/**
 * The size guide popup's body (specs/product-page-v2.md "Size guides"): the intro, then a Clothing guide's table
 * (cm | in) or an Accessories guide's picture, then "Fit tips" and "How to measure" (tips beside the picture when the
 * popup is wide enough).
 */
export function SizeGuideContent({ guide, remember = true, picturePlaceholder }: SizeGuideContentProps) {
  const chartPicture = guide.kind === "PICTURE" ? guide.imageUrl : null;
  const measurePicture = guide.kind === "PICTURE" ? null : guide.imageUrl;
  const tips = guide.howToMeasure;

  return (
    <div className="flex flex-col gap-8 text-body text-ink">
      {guide.intro && <p className="whitespace-pre-line">{guide.intro}</p>}

      {guide.kind === "PICTURE" ? (
        chartPicture ? (
          <SizeChartPicture guide={guide} src={chartPicture} />
        ) : (
          picturePlaceholder
        )
      ) : (
        guide.chart && <SizeGuideTable name={guide.name} chart={guide.chart} remember={remember} />
      )}

      {guide.fitTips && (
        <section className="flex flex-col gap-2">
          <h3 className="text-h3">Fit tips</h3>
          <p className="whitespace-pre-line text-ink-muted">{guide.fitTips}</p>
        </section>
      )}

      {(tips.length > 0 || measurePicture) && (
        <section className="@container flex flex-col gap-4">
          <h3 className="text-h3">How to measure</h3>
          <div
            className={cn("grid items-start gap-6", tips.length > 0 && measurePicture && "@xl:grid-cols-2")}
          >
            {tips.length > 0 && (
              <ul className="flex list-disc flex-col gap-1 pl-6 text-ink-muted">
                {tips.map((tip, i) => (
                  <li key={`${i}:${tip}`}>{tip}</li>
                ))}
              </ul>
            )}
            {measurePicture && (
              <CloudImage
                src={measurePicture}
                alt={guide.imageAlt?.trim() || "How to measure"}
                ratio="square"
                sizes="(min-width: 640px) 20rem, 100vw"
                className="w-full max-w-xs rounded-md"
                imageClassName="object-contain"
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
