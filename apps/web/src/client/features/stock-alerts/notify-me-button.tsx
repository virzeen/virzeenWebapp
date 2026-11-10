"use client";

import { Button, toast } from "@virzeen/ui";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { cancelStockAlertAction, requestStockAlertAction } from "@/server/actions/stock-alerts";

// "Notify me when it's back" on the product page (specs/notify-me.md): the hook holds the customer's requests for
// this product; the main button takes Add to bag's place, and "Don't notify me" sits under it, outside the phone's
// floating bar (patterns.md §6: the button floats alone).

/** Disabling a focused control drops focus to the page: move it to `target`, unless the person has gone elsewhere. */
function focusIfLost(target: HTMLElement | null) {
  const current = document.activeElement;
  if (!current || current === document.body || current.matches(":disabled")) target?.focus();
}

/** This page in the picked style and size, for the way back from sign-in. Spaces as %20 (safeRedirectSchema). */
function returnPath(style: string | null, size: string | null) {
  const query = [
    ...(style ? [`style=${encodeURIComponent(style)}`] : []),
    ...(size ? [`size=${encodeURIComponent(size)}`] : []),
  ].join("&");
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

type UseNotifyMeOptions = {
  /** The product's variants the customer already waits for (from the server). */
  waitingVariantIds: readonly string[];
  signedIn: boolean;
  /** Admin preview: only says nothing was saved. */
  preview: boolean;
  /** The main button: focus comes back to it when the control that had it goes away. */
  buttonRef: React.RefObject<HTMLButtonElement | null>;
};

export function useNotifyMe({ waitingVariantIds, signedIn, preview, buttonRef }: UseNotifyMeOptions) {
  const router = useRouter();
  const [waiting, setWaiting] = useState<ReadonlySet<string>>(() => new Set(waitingVariantIds));
  const [isPending, startTransition] = useTransition();

  function mark(variantId: string, now: boolean) {
    setWaiting((current) => {
      const next = new Set(current);
      if (now) next.add(variantId);
      else next.delete(variantId);
      return next;
    });
  }

  /** Signed in: saves the request. A guest goes to sign-in and comes back to `style` and `size`. */
  function ask(variantId: string, style: string | null, size: string | null) {
    if (preview) return void toast.message("This is a preview. Nothing was saved.");
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(returnPath(style, size))}`);
    if (waiting.has(variantId)) return void toast.message("We'll email you when it's back.");
    startTransition(async () => {
      const result = await requestStockAlertAction({ variantId });
      if (result.ok) {
        mark(variantId, true);
        toast.success("We'll email you when it's back.");
      } else {
        toast.error(messageFor(result.error));
        // "It's back in stock": show the stock as it is now (the picked style and size stay).
        if (result.error.code === "CONFLICT") router.refresh();
      }
      focusIfLost(buttonRef.current);
    });
  }

  function stop(variantId: string) {
    startTransition(async () => {
      const result = await cancelStockAlertAction({ variantId });
      if (result.ok) {
        mark(variantId, false);
        toast.message("We won't email you about it.");
        // "Don't notify me" goes away with the request: focus moves to the main button.
        buttonRef.current?.focus();
      } else {
        toast.error(messageFor(result.error));
        focusIfLost(buttonRef.current);
      }
    });
  }

  return { isWaiting: (variantId: string) => waiting.has(variantId), ask, stop, isPending };
}

type NotifyMeButtonProps = {
  ref: React.Ref<HTMLButtonElement>;
  /** The customer already waits for the picked variant. */
  waiting: boolean;
  isPending: boolean;
  onPress: () => void;
  className?: string;
};

/** "Notify me when it's back", then "We'll email you" with a tick once asked (the label carries the state). */
export function NotifyMeButton({ ref, waiting, isPending, onPress, className }: NotifyMeButtonProps) {
  return (
    <Button
      ref={ref}
      size="lg"
      shape="pill"
      variant={waiting ? "secondary" : "primary"}
      className={className}
      loading={isPending}
      onClick={onPress}
      data-testid="notify-me"
    >
      {waiting && !isPending && <Check className="size-5" strokeWidth={1.5} aria-hidden />}
      {waiting ? "We'll email you" : "Notify me when it's back"}
    </Button>
  );
}

/** "Don't notify me" under the main button (in the page, not the phone's floating bar). */
export function StopNotifyButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <div className="flex justify-center">
      <Button variant="underline" size="sm" disabled={disabled} onClick={onPress}>
        Don&apos;t notify me
      </Button>
    </div>
  );
}
