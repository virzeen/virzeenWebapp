"use client";

import { Button, VisuallyHidden } from "@virzeen/ui";
import { RefreshCw } from "lucide-react";

type ResendCodeProps = {
  /** Seconds until a new code can be sent; 0 when it can. */
  cooldown: number;
  resending: boolean;
  onResend: () => void;
};

/**
 * The end of the sign-in code's field (owner request 2026-11-11, like Nike's): the seconds left while the countdown
 * runs, then a resend icon. Used by the code page and the create-account page, so both behave the same.
 */
export function ResendCode({ cooldown, resending, onResend }: ResendCodeProps) {
  if (cooldown > 0) {
    return (
      <span className="px-2 text-small tabular-nums" data-testid="resend-countdown">
        <span aria-hidden="true">{cooldown}s</span>
        <VisuallyHidden>Resend code in {cooldown} seconds</VisuallyHidden>
      </span>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      shape="pill"
      aria-label="Resend code"
      onClick={onResend}
      disabled={resending}
      loading={resending}
      data-testid="resend-code"
    >
      {!resending && <RefreshCw className="size-5" strokeWidth={1.5} aria-hidden />}
    </Button>
  );
}
