import { ButtonLink, Container, Grid, Link } from "@virzeen/ui";
import { PORTFOLIO_KIND_LABELS } from "@virzeen/validators";
import { colors } from "@virzeen/ui/tokens";
import type { Metadata, Viewport } from "next";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { JsonLd } from "@/client/components/shared/json-ld";
import { ProductCarousel } from "@/client/features/products/product-carousel";
import { siteUrl } from "@/server/env";
import { listCollections, listNewArrivals, listPortfolioProjects } from "@/server/queries/catalog";
import { HOME_DESCRIPTION, HOME_TITLE, siteJsonLd } from "@/server/seo";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
};

// The top of this page is the dark hero, so the browser bar colour is black from the first byte of HTML, not only after
// ThemeColorSync runs: iOS tints its fade behind the status bar from this colour when the app starts.
export const viewport: Viewport = { themeColor: colors.ink };

export default async function HomePage() {
  const [arrivals, collections, projects] = await Promise.all([
    listNewArrivals(12),
    listCollections(true),
    listPortfolioProjects(3),
  ]);
  const [story, ...moreStories] = projects;

  return (
    <>
      <JsonLd data={siteJsonLd(siteUrl)} />
      {/*
        Hero: brand moment, LCP image (the owner's photo, 2026-09-30: a man reading in a dark room, a rack of T-shirts
        on the right). It starts under the see-through header (`pull-under-header`: the header's height plus the iPhone top inset), and the words sit in the
        bottom-right corner, with no buttons (owner). It fills the screen on every device (owner 2026-11-15: phones, tablets
        and computers), the photo cropped around him.
      */}
      <section className="relative isolate pull-under-header overflow-hidden bg-ink text-canvas">
        <CloudImage
          src="/brand/hero.jpg"
          alt=""
          ratio="none"
          // It fills the screen (owner): on a screen wider than the 16:9 photo it is as wide as the screen, otherwise
          // as tall, so 16/9 of the screen height wide.
          sizes="(min-aspect-ratio: 16/9) 100vw, 178vh"
          priority
          className="h-screen-cover w-full"
          imageClassName="object-cover object-hero"
        />
        {/* Scrims keep white text at AA contrast: the header on the bright window (top), the words on the floor. */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/60 to-transparent"
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/20 to-transparent md:bg-linear-to-tl md:from-ink/75 md:via-ink/15"
        />
        <Container className="absolute inset-0 flex flex-col items-end justify-end pb-10 text-right md:pb-16">
          <h1 className="max-w-xl font-display text-display motion-safe:animate-reveal">
            timeless monochromium experience.
          </h1>
        </Container>
      </section>

      {/* New arrivals: a row of cards to swipe, like "You might also like" (owner 2026-11-08). */}
      {arrivals.length > 0 && (
        <Container className="py-16 lg:py-24">
          <ProductCarousel
            title="New and Featured"
            products={arrivals}
            action={
              <Link href="/shop" variant="default" className="inline-flex min-h-11 items-center text-small">
                Shop all
              </Link>
            }
          />
        </Container>
      )}

      {/* Featured portfolio story */}
      {story && (
        <section aria-labelledby="story-heading" className="bg-surface">
          <Container className="grid items-center gap-8 py-16 md:grid-cols-2 lg:gap-16 lg:py-24">
            <CloudImage
              src={story.coverUrl}
              alt={story.coverAlt}
              ratio="portrait"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
            <div className="flex flex-col gap-4">
              <p className="text-caption text-ink-muted uppercase">{PORTFOLIO_KIND_LABELS[story.kind]}</p>
              <h2 id="story-heading" className="font-display text-h1">
                {story.title}
              </h2>
              <p className="max-w-prose text-body-lg text-ink-muted">{story.summary}</p>
              <ButtonLink href={`/portfolio/${story.slug}`} shape="pill" className="self-start">
                Read the story
              </ButtonLink>
            </div>
          </Container>
        </section>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <Container
          as="section"
          className="flex flex-col gap-8 py-16 lg:py-24"
          aria-labelledby="collections-heading"
        >
          <h2 id="collections-heading" className="font-display text-h2">
            Collections
          </h2>
          <Grid columns={collections.length === 2 ? "two" : "three"} gap={4}>
            {collections.map((collection) => {
              const image = collection.products[0]?.images[0];
              return (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  variant="subtle"
                  className="group relative block overflow-hidden rounded-sm text-canvas hover:text-canvas"
                >
                  <CloudImage
                    src={image?.url ?? null}
                    alt=""
                    ratio="landscape"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                  {/* Bottom scrim keeps the name at AA contrast on light images; darkens on hover */}
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/20 to-transparent transition-colors duration-250 ease-standard group-hover:from-ink/80 group-hover:via-ink/40"
                  />
                  <span className="absolute bottom-4 left-4 font-display text-h3">{collection.name}</span>
                </Link>
              );
            })}
          </Grid>
        </Container>
      )}

      {/* More stories */}
      {moreStories.length > 0 && (
        <Container
          as="section"
          className="flex flex-col gap-8 pb-16 lg:pb-24"
          aria-labelledby="more-stories-heading"
        >
          <h2 id="more-stories-heading" className="font-display text-h2">
            From the portfolio
          </h2>
          <Grid columns="two" gap={8}>
            {moreStories.map((project) => (
              <Link
                key={project.id}
                href={`/portfolio/${project.slug}`}
                variant="subtle"
                className="group flex flex-col gap-4 text-ink hover:text-ink"
              >
                <CloudImage
                  src={project.coverUrl}
                  alt={project.coverAlt}
                  ratio="landscape"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
                <span className="font-display text-h3">{project.title}</span>
                <span className="text-body text-ink-muted">{project.summary}</span>
              </Link>
            ))}
          </Grid>
        </Container>
      )}
    </>
  );
}
