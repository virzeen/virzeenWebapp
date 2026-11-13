import { ButtonLink, Container } from "@virzeen/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { BenefitImageCard } from "@/client/features/membership/benefit-image-card";
import { BENEFIT_PAGES, getBenefitPage } from "@/client/features/membership/benefit-pages";
import { BenefitsCarousel } from "@/client/features/membership/benefits-carousel";
import { perkCards } from "@/client/features/membership/perks-grid";
import { getUser } from "@/server/auth/session";
import { getMyMembership, getMyPerks, getMyReferral } from "@/server/queries/account";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getBenefitPage((await params).slug);
  if (!page) notFound();
  return {
    title: page.title,
    description: page.intro.slice(0, 155),
    alternates: { canonical: `/membership/benefits/${page.slug}` },
  };
}

/**
 * One member benefit, laid out like Nike's member exclusive products page (docs/specs/member-benefit-pages.md): a
 * full-width picture, a narrow column with the name and intro, a picture with a heading, text and a pill button, the
 * member's own card for the benefit (signed in) and the row of the other benefits.
 */
export default async function BenefitPage({ params }: Props) {
  const page = getBenefitPage((await params).slug);
  if (!page) notFound();

  const user = await getUser();
  const live =
    user && page.perk
      ? await Promise.all([getMyMembership(user.id), getMyPerks(user.id), getMyReferral(user.id)]).then(
          ([membership, perks, referral]) =>
            perkCards({
              isPass: membership.level === "PASS",
              express: perks.express,
              birthdayMonth: perks.birthdayMonth,
              hasBirthday: perks.hasBirthday,
              early: perks.early,
              referral,
            }).find((card) => card.id === page.perk),
        )
      : undefined;

  const others = BENEFIT_PAGES.filter((entry) => entry.slug !== page.slug);

  return (
    <article className="flex flex-col gap-16 pb-16 lg:gap-24 lg:pb-24">
      <CloudImage
        src={page.hero.src}
        alt={page.hero.alt}
        ratio="hero"
        sizes="100vw"
        priority
        imageClassName={page.hero.position}
      />

      <Container className="flex flex-col gap-16 lg:gap-24">
        <header className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <h1 className="font-display text-h1">{page.title}</h1>
          <p className="text-body-lg">{page.intro}</p>
        </header>

        <section
          aria-labelledby="benefit-feature"
          className="mx-auto flex w-full max-w-2xl flex-col gap-8"
          data-testid="benefit-feature"
        >
          <CloudImage
            src={page.featurePicture.src}
            alt={page.featurePicture.alt}
            ratio="landscape"
            sizes="(min-width: 768px) 672px, 100vw"
            imageClassName={page.featurePicture.position}
          />
          <div className="flex flex-col items-start gap-4">
            <h2 id="benefit-feature" className="font-display text-h3">
              {page.feature.title}
            </h2>
            <p className="text-body-lg">{page.feature.text}</p>
            {user ? (
              <ButtonLink href={page.feature.cta.href} shape="pill" size="lg">
                {page.feature.cta.label}
              </ButtonLink>
            ) : (
              <ButtonLink
                href={`/login?next=${encodeURIComponent(`/membership/benefits/${page.slug}`)}`}
                shape="pill"
                size="lg"
              >
                Sign in
              </ButtonLink>
            )}
          </div>
        </section>

        {live && (
          <section
            aria-label={`Your ${page.title.toLowerCase()}`}
            className="mx-auto flex w-full max-w-2xl flex-col gap-6"
            data-testid="benefit-live"
          >
            {live.node}
          </section>
        )}

        <BenefitsCarousel
          title="Member Benefits"
          items={others.map((entry) => ({ id: entry.slug, node: <BenefitImageCard page={entry} /> }))}
        />
      </Container>
    </article>
  );
}
