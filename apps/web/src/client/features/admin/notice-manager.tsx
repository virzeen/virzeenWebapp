"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Stack,
  Switch,
  toast,
} from "@virzeen/ui";
import {
  NOTICE_AUDIENCE_LABELS,
  NOTICE_AUDIENCES,
  NOTICE_TEXT_MAX,
  siteNoticeSchema,
  type NoticeAudience,
  type SiteNoticeInput,
} from "@virzeen/validators";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { messageFor } from "@/client/lib/error-messages";
import { formatDate } from "@/client/lib/format";
import { deleteNoticeAction, moveNoticeAction, saveNoticeAction } from "@/server/actions/admin/notices";

export type NoticeRow = {
  id: string;
  text: string;
  linkLabel: string | null;
  linkHref: string | null;
  audiences: NoticeAudience[];
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
  status: "LIVE" | "OFF" | "SCHEDULED" | "ENDED";
};

const STATUS = {
  LIVE: { label: "Showing", variant: "success" },
  OFF: { label: "Off", variant: "neutral" },
  SCHEDULED: { label: "Scheduled", variant: "warning" },
  ENDED: { label: "Ended", variant: "neutral" },
} as const;

const EMPTY: SiteNoticeInput = {
  text: "",
  linkLabel: "",
  linkHref: "",
  audiences: [...NOTICE_AUDIENCES],
  startsOn: "",
  endsOn: "",
  isActive: true,
};

/** "YYYY-MM-DD" (a Nepal date) → "11 Nov 2026". Noon keeps it on the same day in any time zone. */
const dayLabel = (day: string) => formatDate(new Date(`${day}T12:00:00+05:45`));

function valuesOf(row: NoticeRow): SiteNoticeInput {
  return {
    id: row.id,
    text: row.text,
    linkLabel: row.linkLabel ?? "",
    linkHref: row.linkHref ?? "",
    audiences: row.audiences,
    startsOn: row.startsOn ?? "",
    endsOn: row.endsOn ?? "",
    isActive: row.isActive,
  };
}

function NoticeForm({ initial, onDone }: { initial?: NoticeRow; onDone: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SiteNoticeInput>({
    resolver: zodResolver(siteNoticeSchema),
    defaultValues: initial ? valuesOf(initial) : EMPTY,
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (initial) formRef.current?.scrollIntoView({ block: "start" });
  }, [initial]);

  async function onSubmit(values: SiteNoticeInput) {
    setFormError(null);
    const result = await saveNoticeAction(values);
    if (!result.ok) {
      const fields = result.error.fields ?? {};
      const known = (["text", "linkLabel", "linkHref", "audiences", "startsOn", "endsOn"] as const)
        .filter((name) => fields[name])
        .map((name) => form.setError(name, { message: fields[name] }, { shouldFocus: true }));
      if (known.length === 0) setFormError(messageFor(result.error));
      return;
    }
    toast.success("Notice saved");
    form.reset(EMPTY);
    onDone();
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      aria-labelledby="notice-form-heading"
      className="grid scroll-mt-4 gap-4 rounded-md border border-line p-5 sm:grid-cols-2"
    >
      <h2 id="notice-form-heading" className="font-display text-h3 sm:col-span-2">
        {initial ? "Edit notice" : "Add a notice"}
      </h2>
      {formError && (
        <Alert variant="danger" className="sm:col-span-2">
          {formError}
        </Alert>
      )}
      <FormField
        label="Notice"
        required
        error={errors.text?.message}
        helper={`One short line, up to ${NOTICE_TEXT_MAX} characters, e.g. "11.11 offers are live."`}
        className="sm:col-span-2"
      >
        <Input autoComplete="off" maxLength={NOTICE_TEXT_MAX} {...form.register("text")} />
      </FormField>
      <FormField
        label="Link words"
        error={errors.linkLabel?.message}
        helper='Underlined after the notice, e.g. "Shop now". Optional.'
      >
        <Input autoComplete="off" {...form.register("linkLabel")} />
      </FormField>
      <FormField
        label="Link address"
        error={errors.linkHref?.message}
        helper="A page on this site, like /shop, or a link starting with https://"
      >
        <Input autoComplete="off" inputMode="url" autoCapitalize="none" {...form.register("linkHref")} />
      </FormField>
      <FormField
        label="Starts on"
        helper="Optional. Shown from the start of that day."
        error={errors.startsOn?.message}
      >
        <Input type="date" {...form.register("startsOn")} />
      </FormField>
      <FormField
        label="Ends on"
        helper="Optional. Shown until the end of that day."
        error={errors.endsOn?.message}
      >
        <Input type="date" {...form.register("endsOn")} />
      </FormField>
      <FormField label="Who sees it" required error={errors.audiences?.message} className="sm:col-span-2">
        <Controller
          control={form.control}
          name="audiences"
          render={({ field }) => (
            <div className="flex flex-col">
              {NOTICE_AUDIENCES.map((audience) => (
                <Checkbox
                  key={audience}
                  label={NOTICE_AUDIENCE_LABELS[audience]}
                  checked={field.value.includes(audience)}
                  onCheckedChange={(checked) =>
                    field.onChange(
                      checked
                        ? [...field.value, audience]
                        : field.value.filter((value) => value !== audience),
                    )
                  }
                />
              ))}
            </div>
          )}
        />
      </FormField>
      <div className="flex flex-col sm:col-span-2">
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Switch
              label="Active"
              description="Switch it off to hide the notice without deleting it."
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" shape="pill" loading={isSubmitting}>
          {initial ? "Save" : "Add notice"}
        </Button>
        {initial && (
          <Button variant="secondary" shape="pill" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function NoticeItem({
  row,
  first,
  last,
  onEdit,
}: {
  row: NoticeRow;
  first: boolean;
  last: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run(action: () => ReturnType<typeof moveNoticeAction>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(messageFor(result.error));
      else router.refresh();
    });
  }

  const dates = [
    row.startsOn && `From ${dayLabel(row.startsOn)}`,
    row.endsOn && `Until ${dayLabel(row.endsOn)}`,
  ].filter(Boolean);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 text-body">
          <span className="font-medium wrap-anywhere">
            {row.text}
            {row.linkLabel && <span className="underline"> {row.linkLabel}</span>}
          </span>
          <Badge variant={STATUS[row.status].variant}>{STATUS[row.status].label}</Badge>
        </span>
        <span className="text-small text-ink-muted">
          {[row.audiences.map((a) => NOTICE_AUDIENCE_LABELS[a]).join(", "), row.linkHref, ...dates]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          shape="pill"
          aria-label="Move up"
          disabled={first || pending}
          onClick={() => run(() => moveNoticeAction({ id: row.id, direction: "up" }))}
        >
          <ChevronUp className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          shape="pill"
          aria-label="Move down"
          disabled={last || pending}
          onClick={() => run(() => moveNoticeAction({ id: row.id, direction: "down" }))}
        >
          <ChevronDown className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
        <Button variant="secondary" size="sm" shape="pill" aria-label={`Edit ${row.text}`} onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          loading={pending}
          aria-label={confirming ? `Confirm delete ${row.text}` : `Delete ${row.text}`}
          onClick={() => (confirming ? run(() => deleteNoticeAction({ id: row.id })) : setConfirming(true))}
          onBlur={() => setConfirming(false)}
        >
          {confirming ? "Sure?" : "Delete"}
        </Button>
      </span>
    </li>
  );
}

/** /admin/notices (specs/top-notice-bar.md): the form above the list, as on Discounts. */
export function NoticeManager({ notices }: { notices: NoticeRow[] }) {
  const [editing, setEditing] = useState<NoticeRow | null>(null);
  return (
    <Stack gap={6}>
      <NoticeForm key={editing?.id ?? "new"} initial={editing ?? undefined} onDone={() => setEditing(null)} />
      {notices.length === 0 ? (
        <EmptyState
          title="No notices yet."
          description="Until you add one, the bar shows a built-in line about free delivery and membership."
        />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {notices.map((row, index) => (
            <NoticeItem
              key={row.id}
              row={row}
              first={index === 0}
              last={index === notices.length - 1}
              onEdit={() => setEditing(row)}
            />
          ))}
        </ul>
      )}
    </Stack>
  );
}
