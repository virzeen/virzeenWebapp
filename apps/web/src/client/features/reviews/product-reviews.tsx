import { ButtonLink, Container } from "@virzeen/ui";
import { formatRating, StarRating } from "@/client/components/shared/star-rating";
import { formatDate } from "@/client/lib/format";

export type ProductReviewItem = {
  id: string;
  rating: number;
  title: string;
  body: string;
  variantLabel: string;
  authorName: string;
  createdAt: Date;
};

type ProductReviewsProps = {
  slug: string;
  summary: { count: number; average: number | null };
  reviews: ProductReviewItem[];
};

const countLabel = (count: number) => (count === 1 ? "1 review" : `${count} reviews`);

/**
 * "Reviews" under the product (specs/reviews.md): the average and count, "Write a review", then the newest reviews
 * (stars, title, text, first name, what they received, the date). Only customers with a delivered order can write
 * one, so every review is from a buyer.
 */
export function ProductReviews({ slug, summary, reviews }: ProductReviewsProps) {
  return (
    <Container className="py-12 lg:py-16">
      <section id="reviews" aria-labelledby="reviews-heading" className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div className="flex flex-col gap-2">
            <h2 id="reviews-heading" className="font-display text-h2">
              Reviews
            </h2>
            {summary.count > 0 && summary.average !== null && (
              <p className="flex items-center gap-2 text-body">
                <StarRating rating={summary.average} />
                <span>
                  {formatRating(summary.average)} · {countLabel(summary.count)}
                </span>
              </p>
            )}
          </div>
          <ButtonLink href={`/account/reviews/${slug}`} variant="secondary" shape="pill">
            Write a review
          </ButtonLink>
        </div>

        {reviews.length === 0 ? (
          <p className="text-body text-ink-muted">No reviews yet. Bought this? Tell others what you think.</p>
        ) : (
          <ul className="flex max-w-prose flex-col divide-y divide-line">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-2 py-6 first:pt-0">
                <StarRating rating={review.rating} />
                {review.title && <h3 className="text-body font-medium">{review.title}</h3>}
                {review.body && <p className="text-body whitespace-pre-line">{review.body}</p>}
                <p className="text-small text-ink-muted">
                  {[review.authorName, review.variantLabel, formatDate(review.createdAt)]
                    .filter(Boolean)
                    .join(" · ")}
                  {" · "}Verified buyer
                </p>
              </li>
            ))}
          </ul>
        )}
        {summary.count > reviews.length && (
          <p className="text-small text-ink-muted">
            Showing the newest {reviews.length} of {summary.count} reviews.
          </p>
        )}
      </section>
    </Container>
  );
}
