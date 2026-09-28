import { ButtonLink, Link, Stack } from "@virzeen/ui";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { ArchiveButton } from "@/client/features/admin/archive-button";
import { PortfolioForm } from "@/client/features/admin/portfolio-form";
import { requireAdminPage } from "@/server/auth/session";
import { getPortfolioProjectForEdit, listProductOptions, uploadsEnabled } from "@/server/queries/admin";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit project" };

export default async function EditPortfolioProjectPage({ params }: Props) {
  await requireAdminPage();
  const [project, productOptions] = await Promise.all([
    getPortfolioProjectForEdit((await params).id),
    listProductOptions(),
  ]);
  if (!project) notFound();
  return (
    <Stack gap={6}>
      <Link href="/admin/portfolio" variant="subtle" className="text-small">
        ← Portfolio
      </Link>
      <AdminPageHeader
        title={project.title}
        actions={
          <>
            {project.isPublished && (
              <ButtonLink href={`/portfolio/${project.slug}`} variant="secondary" size="sm" shape="pill">
                View story
              </ButtonLink>
            )}
            <ArchiveButton
              kind="portfolio"
              id={project.id}
              name={project.title}
              redirectTo="/admin/portfolio"
            />
          </>
        }
      />
      <PortfolioForm
        projectId={project.id}
        productOptions={productOptions}
        uploadsEnabled={uploadsEnabled()}
        defaultValues={{
          title: project.title,
          slug: project.slug,
          kind: project.kind,
          summary: project.summary,
          coverUrl: project.coverUrl,
          coverAlt: project.coverAlt,
          body: project.body,
          productIds: project.productIds,
          isPublished: project.isPublished,
          sortOrder: project.sortOrder,
        }}
      />
    </Stack>
  );
}
