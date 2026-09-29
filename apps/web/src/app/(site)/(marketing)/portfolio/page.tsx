import { Container, EmptyState, Grid, Link } from "@virzeen/ui";
import { PORTFOLIO_KIND_LABELS } from "@virzeen/validators";
import type { Metadata } from "next";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { listPortfolioProjects } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Campaigns, lookbooks and collaborations from Virzeen.",
  alternates: { canonical: "/portfolio" },
};

export default async function PortfolioPage() {
  const projects = await listPortfolioProjects();
  return (
    <Container className="flex flex-col gap-12 py-12 lg:py-16">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="text-caption text-ink-muted uppercase">Portfolio</p>
        <h1 className="font-display text-display">Campaigns, lookbooks and collaborations.</h1>
      </header>
      {projects.length === 0 ? (
        <EmptyState title="Our first stories are coming soon." />
      ) : (
        <Grid columns="two" gap={8} className="gap-y-16">
          {projects.map((project, index) => (
            // The whole card is one link, named by its title; kind and summary are its description.
            // The cover is decorative here (the story page carries its alt text).
            <Link
              key={project.id}
              href={`/portfolio/${project.slug}`}
              variant="subtle"
              aria-labelledby={`project-${project.id}-title`}
              aria-describedby={`project-${project.id}-kind project-${project.id}-summary`}
              className="group flex flex-col gap-4 text-ink hover:text-ink"
            >
              <CloudImage
                src={project.coverUrl}
                alt=""
                ratio="landscape"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={index === 0}
                imageClassName="transition-transform duration-400 ease-standard motion-safe:group-hover:scale-102"
              />
              <span id={`project-${project.id}-kind`} className="text-caption text-ink-muted uppercase">
                {PORTFOLIO_KIND_LABELS[project.kind]}
              </span>
              <h2 id={`project-${project.id}-title`} className="font-display text-h2">
                {project.title}
              </h2>
              <span id={`project-${project.id}-summary`} className="max-w-prose text-body text-ink-muted">
                {project.summary}
              </span>
            </Link>
          ))}
        </Grid>
      )}
    </Container>
  );
}
