"use client";

import { Alert, Button, Checkbox, FormField, RadioGroup, RadioGroupItem, Select, toast } from "@virzeen/ui";
import { CLOTHING_SIZES, REVIEW_NAME_STYLES } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import {
  saveCommunicationAction,
  saveReviewNameAction,
  saveShopPreferencesAction,
} from "@/server/actions/account";

// The editable Settings sections (docs/specs/member-area-nike-layout.md). Like Nike's, each Save stays off until
// something changes, then turns black; saving makes the new values the ones to compare with.

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
      <Button shape="pill" loading={pending} disabled={!dirty} onClick={onSave}>
        Save
      </Button>
    </div>
  );
}

type Shop = { preference: "HOME" | "CLOTHING" | "BOTH"; size: string; unit: "METRIC" | "IMPERIAL" };

/** Settings, Shop preferences: what they shop for, the size to have pre-selected and the unit of measure. */
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
      <FormField label="Clothing size" helper="Provide your size to have it pre-selected when you shop.">
        <Select
          value={value.size}
          onValueChange={(size) => setValue({ ...value, size: size === "none" ? "" : size })}
          placeholder="Choose a size"
          options={[{ value: "none", label: "No size" }, ...CLOTHING_SIZES]}
        />
      </FormField>
      <FormField label="Shopping preferences">
        <RadioGroup
          value={value.preference}
          onValueChange={(preference) => setValue({ ...value, preference: preference as Shop["preference"] })}
        >
          <RadioGroupItem value="CLOTHING" label="Clothing" />
          <RadioGroupItem value="HOME" label="Home" />
          <RadioGroupItem value="BOTH" label="Both" />
        </RadioGroup>
      </FormField>
      <FormField label="Unit of measure">
        <RadioGroup
          value={value.unit}
          onValueChange={(unit) => setValue({ ...value, unit: unit as Shop["unit"] })}
        >
          <RadioGroupItem value="METRIC" label="Metric" />
          <RadioGroupItem value="IMPERIAL" label="Imperial" />
        </RadioGroup>
      </FormField>
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
      <div className="flex flex-col gap-1">
        <h3 className="text-body font-medium">General communication</h3>
        <p className="text-body text-ink-muted">Get updates on new drops, offers and your member benefits.</p>
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

const REVIEW_NAME_LABELS: Record<
  (typeof REVIEW_NAME_STYLES)[number],
  { label: string; description: string }
> = {
  FIRST_NAME: { label: "First name", description: "Reviews show only your first name." },
  FULL_NAME: { label: "Full name", description: "Reviews show your whole name." },
  ANONYMOUS: { label: "Anonymous", description: "Reviews show no name." },
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
    <div className="flex flex-col gap-8">
      {form.error && <Alert variant="danger">{form.error}</Alert>}
      <FormField label="Product review visibility">
        <RadioGroup
          value={form.value}
          onValueChange={(style) => form.setValue(style as (typeof REVIEW_NAME_STYLES)[number])}
        >
          {REVIEW_NAME_STYLES.map((style) => (
            <RadioGroupItem
              key={style}
              value={style}
              label={REVIEW_NAME_LABELS[style].label}
              description={REVIEW_NAME_LABELS[style].description}
            />
          ))}
        </RadioGroup>
      </FormField>
      <SaveRow dirty={form.dirty} pending={form.isPending} onSave={form.save} />
    </div>
  );
}
