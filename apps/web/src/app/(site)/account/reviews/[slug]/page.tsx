import { Alert, ButtonLink, EmptyState, Link, Stack } from "@virzeen/ui";
import { slugSchema } from "@virzeen/validators";
import { notFound } from "next/navigation";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { ReviewForm } from "@/client/features/reviews/review-form";
import { requireUserPage } from "@/server/auth/session";
import { getMyReviewPage } from "@/server/queries/account";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Write a review" };

/** Write or edit a review of a product delivered to this customer (specs/reviews.md). */
export default async function ReviewPage({ params }: Props) {
  const { slug } = await params;
  const user = await requireUserPage(`/account/reviews/${slug}`);
  if (!slugSchema.safeParse(slug).success) notFound();
  const page = await getMyReviewPage(user.id, slug);
  if (!page) notFound();
  const { product, canReview, review, isHidden } = page;

  return (
    <Stack gap={8}>
      <div className="flex flex-col gap-2">
        <Link
          href={`/product/${product.slug}`}
          variant="subtle"
          className="inline-flex min-h-11 items-center self-start text-small"
        >
          ← {product.name}
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-16 shrink-0">
            <CloudImage src={product.imageUrl} alt={product.imageAlt} sizes="64px" />
          </div>
          <h2 className="font-display text-h2">{review ? "Edit your review" : "Write a review"}</h2>
        </div>
      </div>
      {!canReview ? (
        <EmptyState
          titleAs="h3"
          title="You can review this once it has been delivered to you."
          description="Reviews come only from customers who received the product."
          action={
            <ButtonLink href={`/product/${product.slug}`} shape="pill">
              Back to the product
            </ButtonLink>
          }
        />
      ) : (
        <>
          {isHidden && (
            <Alert variant="info">
              Your review is hidden from the shop. Questions? Write to us from the contact page.
            </Alert>
          )}
          <ReviewForm productId={product.id} productSlug={product.slug} review={review} />
        </>
      )}
    </Stack>
  );
}
