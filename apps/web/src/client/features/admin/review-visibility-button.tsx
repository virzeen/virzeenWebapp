"use client";

import { Button, toast } from "@virzeen/ui";
import { useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { setReviewVisibilityAction } from "@/server/actions/admin/reviews";

type ReviewVisibilityButtonProps = { reviewId: string; hidden: boolean; productName: string };

/** "Hide" or "Show" on the admin reviews list (specs/reviews.md); the list refreshes from the server after it. */
export function ReviewVisibilityButton({ reviewId, hidden, productName }: ReviewVisibilityButtonProps) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setReviewVisibilityAction({ reviewId, hidden: !hidden });
      if (result.ok) toast.success(hidden ? "Review shown in the shop" : "Review hidden from the shop");
      else toast.error(messageFor(result.error));
    });
  }

  return (
    <Button variant="secondary" size="sm" shape="pill" loading={isPending} onClick={toggle}>
      {hidden ? "Show" : "Hide"}
      <span className="sr-only"> the review of {productName}</span>
    </Button>
  );
}
