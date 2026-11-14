"use client";

import { Alert, Button, Checkbox, RadioGroup, RadioGroupItem, toast } from "@virzeen/ui";
import { REVIEW_NAME_STYLES } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import {
  saveCommunicationAction,
  savePaymentMethodAction,
  saveReviewNameAction,
} from "@/server/actions/account";

// The editable Settings sections, laid out like Nike's (docs/specs/member-area-nike-layout.md): tight radio and
// checkbox rows, a Save on the right that stays off until something changes, then turns black. Payment methods has no
// Save: a tick is saved at once.

type SaveResult = { ok: true } | { ok: false; message: string };

/** The shared shape: values, a Save button that is off until they differ from the saved ones, and an error line. */
function useSaver<T>(saved: T, same: (a: T, b: T) => boolean, run: (value: T) => Promise<SaveResult>) {
  const router = useRouter();
  const [value, setValue] = useState(saved);
  const [base, setBase] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dirty = !same(value, base);
  function save() {
    setError(null);
    startTransition(async () => {
      const result = await run(value);
      if (!result.ok) return setError(result.message);
      toast.success("Saved");
      setBase(value);
      router.refresh();
    });
  }
  return { value, setValue, dirty, error, isPending, save };
}

function SaveRow({ dirty, pending, onSave }: { dirty: boolean; pending: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end">
      <Button
        shape="pill"
        loading={pending}
        disabled={!dirty}
        onClick={onSave}
        className="disabled:bg-line disabled:text-ink-muted disabled:opacity-100"
      >
        Save
      </Button>
    </div>
  );
}

/**
 * Settings, Payment methods: cash on delivery is the one method offered, ticked or not. There is no Save button: a tick
 * (or an untick) is saved straight away, the box turning at once and going back with a message if the save fails.
 */
export function PaymentMethodForm({ initial }: { initial: "COD" | null }) {
  const router = useRouter();
  const [chosen, setChosen] = useState(initial === "COD");
  const [isPending, startTransition] = useTransition();

  function change(next: boolean) {
    setChosen(next);
    startTransition(async () => {
      const result = await savePaymentMethodAction({ method: next ? "COD" : null });
      if (!result.ok) {
        setChosen(!next);
        toast.error(messageFor(result.error));
        return;
      }
      toast.success("Saved");
      router.refresh();
    });
  }

  return (
    <Checkbox
      label="Cash on delivery"
      checked={chosen}
      disabled={isPending}
      onCheckedChange={(value) => change(value === true)}
    />
  );
}

/** Settings, Communication preferences: the marketing email tick. */
export function CommunicationForm({ initial }: { initial: boolean }) {
  const form = useSaver<boolean>(
    initial,
    (a, b) => a === b,
    async (marketingOptIn) => {
      const result = await saveCommunicationAction({ marketingOptIn });
      return result.ok ? { ok: true } : { ok: false, message: messageFor(result.error) };
    },
  );
  return (
    <div className="flex flex-col gap-6">
      {form.error && <Alert variant="danger">{form.error}</Alert>}
      <div className="flex flex-col gap-3">
        <h3 className="text-body font-medium">General communication</h3>
        <p className="text-body">Get updates on new drops, offers and your member benefits.</p>
      </div>
      <Checkbox
        label="Yes, send me emails."
        checked={form.value}
        onCheckedChange={(checked) => form.setValue(checked === true)}
      />
      <SaveRow dirty={form.dirty} pending={form.isPending} onSave={form.save} />
    </div>
  );
}

const REVIEW_NAME_LABELS: Record<(typeof REVIEW_NAME_STYLES)[number], string> = {
  FIRST_NAME: "First name: only your first name shows",
  FULL_NAME: "Full name: your whole name shows",
  ANONYMOUS: "Anonymous: no name shows",
};

/** Settings, Profile visibility: the name a product review shows. */
export function ReviewNameForm({ initial }: { initial: (typeof REVIEW_NAME_STYLES)[number] }) {
  const form = useSaver<(typeof REVIEW_NAME_STYLES)[number]>(
    initial,
    (a, b) => a === b,
    async (style) => {
      const result = await saveReviewNameAction({ style });
      return result.ok ? { ok: true } : { ok: false, message: messageFor(result.error) };
    },
  );
  return (
    <div className="flex flex-col gap-6">
      {form.error && <Alert variant="danger">{form.error}</Alert>}
      <RadioGroup
        aria-label="Product review visibility"
        className="gap-0"
        value={form.value}
        onValueChange={(style) => form.setValue(style as (typeof REVIEW_NAME_STYLES)[number])}
      >
        {REVIEW_NAME_STYLES.map((style) => (
          <RadioGroupItem key={style} value={style} label={REVIEW_NAME_LABELS[style]} />
        ))}
      </RadioGroup>
      <SaveRow dirty={form.dirty} pending={form.isPending} onSave={form.save} />
    </div>
  );
}
