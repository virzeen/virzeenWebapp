import { ButtonLink, Container, Grid, Link } from "@virzeen/ui";
import { PORTFOLIO_KIND_LABELS } from "@virzeen/validators";
import type { Metadata } from "next";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { JsonLd } from "@/client/components/shared/json-ld";
import { ProductCard } from "@/client/features/products/product-card";
import { siteUrl } from "@/server/env";
import { listCollections, listNewArrivals, listPortfolioProjects } from "@/server/queries/catalog";
import { HOME_DESCRIPTION, HOME_TITLE, siteJsonLd } from "@/server/seo";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [arrivals, collections, projects] = await Promise.all([
    listNewArrivals(8),
    listCollections(true),
    listPortfolioProjects(3),
  ]);
  const [story, ...moreStories] = projects;

  return (
    <>
      <JsonLd data={siteJsonLd(siteUrl)} />
      {/* Hero: brand moment, LCP image */}
      <section className="relative isolate overflow-hidden bg-ink text-canvas">
        <CloudImage
          src="/brand/hero.jpg"
          alt=""
          ratio="hero"
          // Phones crop the 16:9 photo into a 4:5 frame, so it's drawn about 2.2× the screen width.
          sizes="(min-width: 768px) 100vw, 223vw"
          priority
          className="min-h-128 md:min-h-0"
          imageClassName="object-cover"
        />
        {/* Scrim: keeps the white text at AA contrast on light parts of the image (bottom on phones, right from md) */}
        <span
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/30 to-transparent md:bg-linear-to-l md:from-ink/60 md:via-ink/30"
        />
        <Container className="absolute inset-0 flex flex-col justify-end gap-8 pb-12 md:items-end md:justify-center md:pb-0 md:text-right">
          <h1 className="max-w-xl font-display text-display motion-safe:animate-reveal">
            timeless monochromium experience.
          </h1>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <ButtonLink href="/shop" variant="inverse" shape="pill" size="lg">
              Shop the collection
            </ButtonLink>
            <ButtonLink
              href="/portfolio"
              variant="secondary"
              shape="pill"
              size="lg"
              className="border-canvas/40 bg-transparent text-canvas hover:border-canvas hover:bg-canvas/10"
            >
              Explore the portfolio
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <Container
          as="section"
          className="flex flex-col gap-8 py-16 lg:py-24"
          aria-labelledby="arrivals-heading"
        >
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-caption text-ink-muted uppercase">New in</p>
              <h2 id="arrivals-heading" className="font-display text-h2">
                The latest pieces
              </h2>
            </div>
            <Link
              href="/shop"
              variant="default"
              className="-mb-3 inline-flex min-h-11 shrink-0 items-center text-small"
            >
              Shop all
            </Link>
          </div>
          <Grid columns="products" gap={4} className="gap-y-10">
            {arrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Grid>
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
