"use client";

import { Button, toast } from "@virzeen/ui";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { cancelStockAlertAction, requestStockAlertAction } from "@/server/actions/stock-alerts";

type NotifyMeButtonProps = {
  ref?: React.Ref<HTMLButtonElement>;
  variantId: string;
  /** The customer already waits for this variant. */
  waiting: boolean;
  onWaitingChange: (variantId: string, waiting: boolean) => void;
  signedIn: boolean;
  /** Where sign-in brings a guest back: this product, style and size. */
  returnTo: () => string;
  /** Admin preview: only says nothing was saved. */
  preview?: boolean;
  className?: string;
};

/**
 * "Notify me when it's back" in place of Add to bag when the picked size is sold out (specs/notify-me.md). Signed in,
 * it saves the request and becomes "We'll email you" with "Don't notify me" under it; a guest goes to sign-in and
 * comes back to the same style and size.
 */
export function NotifyMeButton({
  ref,
  variantId,
  waiting,
  onWaitingChange,
  signedIn,
  returnTo,
  preview = false,
  className,
}: NotifyMeButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function ask() {
    if (preview) return void toast.message("This is a preview. Nothing was saved.");
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(returnTo())}`);
    if (waiting) return void toast.message("We'll email you when it's back.");
    startTransition(async () => {
      const result = await requestStockAlertAction({ variantId });
      if (!result.ok) return void toast.error(messageFor(result.error));
      onWaitingChange(variantId, true);
      toast.success("We'll email you when it's back.");
    });
  }

  function stop() {
    startTransition(async () => {
      const result = await cancelStockAlertAction({ variantId });
      if (!result.ok) return void toast.error(messageFor(result.error));
      onWaitingChange(variantId, false);
      toast.message("We won't email you about it.");
    });
  }

  return (
    <>
      <Button
        ref={ref}
        size="lg"
        shape="pill"
        variant={waiting ? "secondary" : "primary"}
        className={className}
        loading={isPending}
        aria-pressed={signedIn && !preview ? waiting : undefined}
        onClick={ask}
        data-testid="notify-me"
      >
        {waiting && <Check className="size-5" strokeWidth={1.5} aria-hidden />}
        {waiting ? "We'll email you" : "Notify me when it's back"}
      </Button>
      {waiting && (
        // With nothing behind the bar on phones, the button gets its own backing to stay readable.
        <div className="pointer-events-auto mx-auto mt-2 flex w-fit rounded-sm bg-canvas px-2 md:mt-1 md:px-0">
          <Button variant="underline" size="sm" disabled={isPending} onClick={stop}>
            Don&apos;t notify me
          </Button>
        </div>
      )}
    </>
  );
}
