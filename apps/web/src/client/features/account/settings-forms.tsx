"use client";

import { Alert, Button, Checkbox, RadioGroup, RadioGroupItem, Select, toast } from "@virzeen/ui";
import { CLOTHING_SIZES, REVIEW_NAME_STYLES } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import {
  saveCommunicationAction,
  saveReviewNameAction,
  saveShopPreferencesAction,
} from "@/server/actions/account";

// The editable Settings sections, laid out like Nike's (docs/specs/member-area-nike-layout.md): plain group titles,
// tight radio and checkbox rows, a Save on the right that stays off until something changes, then turns black.

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

/** A group title (16px, medium) over its choices, like Nike's "Shopping Preferences". */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-body font-medium">
        {title}
      </h3>
      {children}
    </div>
  );
}

type Shop = { preference: "HOME" | "CLOTHING" | "BOTH"; size: string; unit: "METRIC" | "IMPERIAL" };

/** Settings, Shop preferences: the size to have pre-selected, what they shop for and the unit of measure. */
export function ShopPreferencesForm({ initial }: { initial: Shop }) {
  const form = useSaver<Shop>(
    initial,
    (a, b) => a.preference === b.preference && a.size === b.size && a.unit === b.unit,
    async (value) => {
      const result = await saveShopPreferencesAction(value);
      return result.ok ? { ok: true } : { ok: false, message: messageFor(result.error) };
    },
  );
  const { value, setValue } = form;
  return (
    <div className="flex flex-col gap-8">
      {form.error && <Alert variant="danger">{form.error}</Alert>}
      {/* Nike's size box: the label sits on the top border of a 56px outlined select. */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Select
            aria-label="Clothing size"
            className="h-14 px-4"
            value={value.size}
            onValueChange={(size) => setValue({ ...value, size: size === "none" ? "" : size })}
            placeholder="Clothing size"
            options={[{ value: "none", label: "No size" }, ...CLOTHING_SIZES]}
          />
          {value.size && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-0 left-3 -translate-y-1/2 bg-canvas px-1 text-small text-ink-muted"
            >
              Clothing size
            </span>
          )}
        </div>
        <p className="px-4 text-small text-ink-muted">
          Provide your size to have it pre-selected when you shop.
        </p>
      </div>
      <Group title="Shopping preferences">
        <RadioGroup
          aria-label="Shopping preferences"
          className="gap-0"
          value={value.preference}
          onValueChange={(preference) => setValue({ ...value, preference: preference as Shop["preference"] })}
        >
          <RadioGroupItem value="CLOTHING" label="Clothing" />
          <RadioGroupItem value="HOME" label="Home" />
          <RadioGroupItem value="BOTH" label="Both" />
        </RadioGroup>
      </Group>
      <Group title="Unit of measure">
        <RadioGroup
          aria-label="Unit of measure"
          className="gap-0"
          value={value.unit}
          onValueChange={(unit) => setValue({ ...value, unit: unit as Shop["unit"] })}
        >
          <RadioGroupItem value="METRIC" label="Metric" />
          <RadioGroupItem value="IMPERIAL" label="Imperial" />
        </RadioGroup>
      </Group>
      <SaveRow dirty={form.dirty} pending={form.isPending} onSave={form.save} />
    </div>
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
