import { ButtonLink, Container, Grid, Link } from "@virzeen/ui";
import { Banknote, ShieldCheck, Truck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { ProductCard } from "@/client/features/products/product-card";
import { listCollections, listNewArrivals, listPortfolioProjects } from "@/server/queries/catalog";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PROMISES = [
  { icon: Banknote, title: "Cash on delivery", text: "Pay the courier when your order arrives." },
  { icon: Wallet, title: "eSewa & Khalti", text: "Pay securely with the wallets you already use." },
  { icon: Truck, title: "Delivery across Nepal", text: "1–3 days in Kathmandu Valley, 3–7 days elsewhere." },
  { icon: ShieldCheck, title: "Honest prices", text: "VAT included. Shipping shown before you pay." },
] as const;

export default async function HomePage() {
  const [arrivals, collections, projects] = await Promise.all([
    listNewArrivals(8),
    listCollections(true),
    listPortfolioProjects(3),
  ]);
  const [story, ...moreStories] = projects;

  return (
    <>
      {/* Hero: brand moment, LCP image */}
      <section className="relative isolate overflow-hidden bg-ink text-canvas">
        <CloudImage
          src="/brand/hero.jpg"
          alt=""
          ratio="hero"
          sizes="100vw"
          priority
          className="min-h-128 md:min-h-0"
          imageClassName="object-cover"
        />
        <Container className="inset-0 gap-8 pb-12 md:items-end md:justify-center md:pb-0 md:text-right absolute flex flex-col justify-end">
          <h1 className="max-w-xl font-display text-display motion-safe:animate-reveal">
            timeless monochromium experience.
          </h1>
          <div className="gap-3 md:justify-end flex flex-wrap">
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
          className="gap-8 py-16 lg:py-24 flex flex-col"
          aria-labelledby="arrivals-heading"
        >
          <div className="gap-4 flex items-end justify-between">
            <div className="gap-2 flex flex-col">
              <p className="text-caption text-ink-muted uppercase">New in</p>
              <h2 id="arrivals-heading" className="font-display text-h2">
                The latest pieces
              </h2>
            </div>
            <Link href="/shop" variant="default" className="shrink-0 text-small">
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
          <Container className="gap-8 py-16 md:grid-cols-2 lg:gap-16 lg:py-24 grid items-center">
            <CloudImage
              src={story.coverUrl}
              alt={story.coverAlt}
              ratio="portrait"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
            <div className="gap-4 flex flex-col">
              <p className="text-caption text-ink-muted uppercase">{story.kind.toLowerCase()}</p>
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
          className="gap-8 py-16 lg:py-24 flex flex-col"
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
                  <span className="inset-0 absolute bg-ink/30 transition-colors duration-250 ease-standard group-hover:bg-ink/45" />
                  <span className="bottom-4 left-4 absolute font-display text-h3">{collection.name}</span>
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
          className="gap-8 pb-16 lg:pb-24 flex flex-col"
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
                className="group gap-4 flex flex-col text-ink hover:text-ink"
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

      {/* Promises */}
      <section aria-label="Why shop with Virzeen" className="border-t border-line">
        <Container className="gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4 grid grid-cols-1">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="gap-4 flex">
              <Icon className="size-6 shrink-0 text-ink" strokeWidth={1.5} aria-hidden />
              <div className="gap-1 flex flex-col">
                <p className="font-medium text-body">{title}</p>
                <p className="text-small text-ink-muted">{text}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>
    </>
  );
}
