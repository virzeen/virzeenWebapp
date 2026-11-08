import { Badge, ButtonLink, DataTable, EmptyState, Link } from "@virzeen/ui";
import { adminReviewFiltersSchema, type AdminReviewFilters } from "@virzeen/validators";
import { StarRating } from "@/client/components/shared/star-rating";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { ReviewVisibilityButton } from "@/client/features/admin/review-visibility-button";
import { formatDate } from "@/client/lib/format";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminReviews } from "@/server/queries/admin";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata = { title: "Reviews" };

const FILTERS = [
  { status: undefined, label: "All" },
  { status: "shown", label: "Shown" },
  { status: "hidden", label: "Hidden" },
] as const;

const CHIP =
  "inline-flex min-h-11 items-center rounded-full border border-line px-4 text-small aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-canvas";

const listHref = (status: AdminReviewFilters["status"], page = 1) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/reviews?${query}` : "/admin/reviews";
};

/** Every customer review, newest first; Hide takes one out of the shop (specs/reviews.md). */
export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const filters = adminReviewFiltersSchema.parse(flattenSearchParams(await searchParams));
  const { rows, total, pageCount } = await listAdminReviews(filters);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Reviews"
        description="Customers can review a product once it's delivered. A hidden review leaves the shop and its average."
      />
      <nav aria-label="Filter reviews" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={listHref(filter.status)}
            variant="subtle"
            aria-current={filters.status === filter.status ? "page" : undefined}
            className={CHIP}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      <p className="text-small text-ink-muted">{total === 1 ? "1 review" : `${total} reviews`}</p>
      <DataTable
        caption="Reviews"
        rows={rows}
        getRowId={(row) => row.id}
        empty={<EmptyState title={filters.status === "hidden" ? "No hidden reviews." : "No reviews yet."} />}
        columns={[
          {
            key: "review",
            header: "Review",
            cell: (row) => (
              <div className="flex max-w-prose flex-col gap-1">
                <StarRating rating={row.rating} />
                {row.title && <p className="font-medium">{row.title}</p>}
                {row.body && <p className="line-clamp-3 whitespace-pre-line">{row.body}</p>}
                <p className="text-small text-ink-muted">
                  <Link href={`/product/${row.product.slug}`}>{row.product.name}</Link>
                  {row.variantLabel && ` · ${row.variantLabel}`}
                </p>
                <span className="md:hidden">
                  <Badge variant={row.hiddenAt ? "neutral" : "success"}>
                    {row.hiddenAt ? "Hidden" : "Shown"}
                  </Badge>
                </span>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            hideBelow: "lg",
            cell: (row) => (
              <span className="flex flex-col">
                <span>{row.user.name || "—"}</span>
                <span className="text-small wrap-anywhere text-ink-muted">{row.user.email}</span>
              </span>
            ),
          },
          { key: "date", header: "Date", hideOnMobile: true, cell: (row) => formatDate(row.createdAt) },
          {
            key: "status",
            header: "Status",
            hideOnMobile: true,
            cell: (row) => (
              <Badge variant={row.hiddenAt ? "neutral" : "success"}>
                {row.hiddenAt ? "Hidden" : "Shown"}
              </Badge>
            ),
          },
          {
            key: "action",
            header: "Action",
            align: "right",
            cell: (row) => (
              <ReviewVisibilityButton
                reviewId={row.id}
                hidden={row.hiddenAt !== null}
                productName={row.product.name}
              />
            ),
          },
        ]}
      />
      {pageCount > 1 && (
        <div className="flex justify-between">
          {filters.page > 1 ? (
            <ButtonLink
              href={listHref(filters.status, filters.page - 1)}
              variant="secondary"
              size="sm"
              shape="pill"
            >
              Previous
            </ButtonLink>
          ) : (
            <span />
          )}
          {filters.page < pageCount && (
            <ButtonLink
              href={listHref(filters.status, filters.page + 1)}
              variant="secondary"
              size="sm"
              shape="pill"
            >
              Next
            </ButtonLink>
          )}
        </div>
      )}
    </div>
  );
}
