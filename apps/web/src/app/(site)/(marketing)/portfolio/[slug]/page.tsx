import { ButtonLink, Container, Grid } from "@virzeen/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { ProductCard } from "@/client/features/products/product-card";
import { getPortfolioProject } from "@/server/queries/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getPortfolioProject((await params).slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary.slice(0, 155),
    alternates: { canonical: `/portfolio/${project.slug}` },
    openGraph: { title: `${project.title} — Virzeen`, description: project.summary.slice(0, 155) },
  };
}

/** Portfolio story: full-bleed hero, alternating image/text, products at the end (patterns.md §9). */
export default async function PortfolioProjectPage({ params }: Props) {
  const project = await getPortfolioProject((await params).slug);
  if (!project) notFound();

  return (
    <article>
      <header className="relative isolate bg-ink text-canvas">
        <CloudImage src={project.coverUrl} alt={project.coverAlt} ratio="hero" sizes="100vw" priority />
        <div className="absolute inset-0 bg-ink/35" aria-hidden />
        <Container className="absolute inset-x-0 bottom-0 flex flex-col gap-4 pb-12">
          <p className="text-caption text-canvas/80 uppercase">{project.kind.toLowerCase()}</p>
          <h1 className="max-w-3xl font-display text-display motion-safe:animate-reveal">{project.title}</h1>
        </Container>
      </header>

      <Container width="narrow" className="py-16 lg:py-24">
        <p className="text-body-lg text-ink-muted">{project.summary}</p>
      </Container>

      <div className="flex flex-col gap-16 pb-16 lg:gap-24">
        {project.body.map((block) =>
          block.type === "text" ? (
            <Container
              key={`text-${block.heading ?? ""}-${block.text.slice(0, 40)}`}
              width="narrow"
              className="flex flex-col gap-4"
            >
              {block.heading && <h2 className="font-display text-h2">{block.heading}</h2>}
              <p className="text-body-lg whitespace-pre-line text-ink">{block.text}</p>
            </Container>
          ) : (
            <figure
              key={`image-${block.url}`}
              className={block.layout === "full" ? "w-full" : "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8"}
            >
              <CloudImage
                src={block.url}
                alt={block.alt}
                ratio={block.layout === "full" ? "wide" : "landscape"}
                sizes={block.layout === "full" ? "100vw" : "(min-width: 1024px) 1024px, 100vw"}
              />
              {block.caption && (
                <figcaption className="px-4 pt-3 text-small text-ink-muted sm:px-6 lg:px-8">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          ),
        )}
      </div>

      {project.products.length > 0 && (
        <Container
          as="section"
          className="flex flex-col gap-8 border-t border-line py-16"
          aria-labelledby="shop-the-story"
        >
          <div className="flex items-end justify-between gap-4">
            <h2 id="shop-the-story" className="font-display text-h2">
              Shop the story
            </h2>
            <ButtonLink href="/shop" variant="link">
              Shop all
            </ButtonLink>
          </div>
          <Grid columns="products" gap={4}>
            {project.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Grid>
        </Container>
      )}
    </article>
  );
}
