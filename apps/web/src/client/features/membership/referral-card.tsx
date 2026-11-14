"use client";

import { Button, Input, toast } from "@virzeen/ui";
import { Check, Copy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Price } from "@/client/components/shared/price";
import { messageFor } from "@/client/lib/error-messages";
import { applyReferralCodeAction } from "@/server/actions/account";
import { PerkCard } from "./perk-card";

type ReferralCardProps = {
  code: string;
  /** What a friend's first delivered order pays this member, in paisa (Rs 200 MONO Member, Rs 300 Pass). */
  rewardPaisa: number;
  isPass: boolean;
  friends: number;
  earnedPaisa: number;
  invitedBy: string | null;
  canEnterCode: boolean;
};

/**
 * "Refer a friend" (specs/member-perks.md): the member's code with a copy button, what a friend earns them, and, for a
 * new member who hasn't ordered, a field for the code of the friend who invited them.
 */
export function ReferralCard({
  code,
  rewardPaisa,
  isPass,
  friends,
  earnedPaisa,
  invitedBy,
  canEnterCode,
}: ReferralCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the code and copy it.");
    }
  }

  function apply() {
    setError(null);
    startTransition(async () => {
      const result = await applyReferralCodeAction({ code: friendCode });
      if (!result.ok) return setError(result.error.fields?.code ?? messageFor(result.error));
      toast.success("Code added");
      setFriendCode("");
      router.refresh();
    });
  }

  return (
    <PerkCard
      testId="perk-referral"
      icon={<Users className="size-5" strokeWidth={1.5} />}
      title="Refer a friend"
      value={
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy your code ${code}`}
          className="flex cursor-pointer items-center gap-3 font-mono tracking-widest"
        >
          <span data-testid="referral-code">{code}</span>
          {copied ? (
            <Check className="size-5" strokeWidth={1.5} aria-hidden />
          ) : (
            <Copy className="size-5 text-ink-muted" strokeWidth={1.5} aria-hidden />
          )}
        </button>
      }
    >
      <p className="text-small text-ink-muted">
        <Price paisa={rewardPaisa} /> credit when a friend&apos;s first order is delivered
        {isPass ? ", and they get a month of the Pass" : ""}.
      </p>
      {friends > 0 && (
        <p className="text-small" data-testid="referral-stats">
          {friends} {friends === 1 ? "friend" : "friends"} joined
          {earnedPaisa > 0 && (
            <>
              {" "}
              · <Price paisa={earnedPaisa} /> earned
            </>
          )}
        </p>
      )}
      {invitedBy && <p className="text-small text-ink-muted">Invited by {invitedBy}.</p>}
      {canEnterCode && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <div className="flex gap-2">
            <Input
              aria-label="A friend's code"
              placeholder="A friend's code"
              autoCapitalize="characters"
              autoComplete="off"
              value={friendCode}
              onChange={(event) => setFriendCode(event.target.value)}
            />
            <Button
              shape="pill"
              variant="secondary"
              loading={isPending}
              disabled={!friendCode.trim()}
              onClick={apply}
            >
              Add
            </Button>
          </div>
          {error && <p className="text-small text-danger">{error}</p>}
        </div>
      )}
    </PerkCard>
  );
}
