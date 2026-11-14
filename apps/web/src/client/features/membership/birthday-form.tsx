"use client";

import { Button, Input, toast } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { setBirthdayAction } from "@/server/actions/account";

/** A member without a saved birthday adds it here, once, for the birthday reward (specs/member-perks.md). */
export function BirthdayForm() {
  const router = useRouter();
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setBirthdayAction({ birthday });
      if (!result.ok) return setError(result.error.fields?.birthday ?? messageFor(result.error));
      toast.success("Birthday saved");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="date"
          aria-label="Your birthday"
          value={birthday}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(event) => setBirthday(event.target.value)}
        />
        <Button shape="pill" loading={isPending} disabled={!birthday} onClick={save}>
          Save
        </Button>
      </div>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
