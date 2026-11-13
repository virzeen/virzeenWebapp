import { Link } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import type { BenefitPage } from "./benefit-pages";

/**
 * One member benefit as Nike's "Member Benefits" card (docs/specs/member-benefit-pages.md): a wide picture, the name under
 * it and one short line. The whole card is one link to the benefit's page.
 */
export function BenefitImageCard({ page }: { page: BenefitPage }) {
  return (
    <Link
      href={`/membership/benefits/${page.slug}`}
      variant="subtle"
      className="group flex w-full flex-col gap-3"
      data-testid="benefit-card"
    >
      <CloudImage
        src={page.card.src}
        alt=""
        ratio="landscape"
        sizes="(min-width: 960px) 33vw, (min-width: 768px) 50vw, 85vw"
        className="overflow-hidden rounded-xl bg-surface"
        imageClassName={`${page.card.position} transition-transform duration-300 motion-safe:group-hover:scale-105`}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-body-lg text-ink">{page.title}</span>
        <span className="text-small text-ink-muted">{page.caption}</span>
      </span>
    </Link>
  );
}
