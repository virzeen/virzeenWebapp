"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  FormField,
  Input,
  RadioGroup,
  RadioGroupItem,
  Stack,
  Switch,
  toast,
} from "@virzeen/ui";
import { discountCodeSchema, type DiscountCodeInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Price } from "@/client/components/shared/price";
import { messageFor } from "@/client/lib/error-messages";
import { formatDate } from "@/client/lib/format";
import { saveDiscountCodeAction } from "@/server/actions/admin/discounts";
import { RupeesInput } from "./rupees-input";

export type DiscountRow = {
  id: string;
  code: string;
  kind: "PERCENT" | "FIXED";
  percentOff: number | null;
  amountOffPaisa: number | null;
  minSubtotalPaisa: number | null;
  endsOn: string | null;
  maxUses: number | null;
  usedCount: number;
  oncePerCustomer: boolean;
  isActive: boolean;
  status: "ACTIVE" | "OFF" | "ENDED" | "USED_UP";
};

const STATUS = {
  ACTIVE: { label: "Active", variant: "success" },
  OFF: { label: "Off", variant: "neutral" },
  ENDED: { label: "Ended", variant: "neutral" },
  USED_UP: { label: "Used up", variant: "warning" },
} as const;

const EMPTY: DiscountCodeInput = {
  code: "",
  kind: "PERCENT",
  oncePerCustomer: false,
  isActive: true,
  endsOn: "",
};

/** Under the type and amount when editing: they're fixed once the code is made (discountService.save). */
const AMOUNT_FIXED = "Fixed once the code is made. To change it, switch this code off and make a new one.";

/** "YYYY-MM-DD" (a Nepal date) → "31 Dec 2026". Noon keeps it on the same day in any time zone. */
const endsOnLabel = (endsOn: string) => formatDate(new Date(`${endsOn}T12:00:00+05:45`));

/** Number inputs: blank means "no limit", so it's left out rather than sent as 0. */
const optionalNumber = (value: unknown) => (value === "" || value === null ? undefined : Number(value));

function valuesOf(row: DiscountRow): DiscountCodeInput {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    ...(row.percentOff !== null ? { percentOff: row.percentOff } : {}),
    ...(row.amountOffPaisa !== null ? { amountOffPaisa: row.amountOffPaisa } : {}),
    ...(row.minSubtotalPaisa !== null ? { minSubtotalPaisa: row.minSubtotalPaisa } : {}),
    endsOn: row.endsOn ?? "",
    ...(row.maxUses !== null ? { maxUses: row.maxUses } : {}),
    oncePerCustomer: row.oncePerCustomer,
    isActive: row.isActive,
  };
}

function DiscountForm({ initial, onDone }: { initial?: DiscountRow; onDone: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<DiscountCodeInput>({
    resolver: zodResolver(discountCodeSchema),
    defaultValues: initial ? valuesOf(initial) : EMPTY,
  });
  const { errors, isSubmitting } = form.formState;
  const kind = useWatch({ control: form.control, name: "kind" });

  // The form sits above the list: bring it into view when a row's Edit is chosen (it remounts per row). The code
  // can't change, so focus goes to the heading ("Edit WELCOME10") and Tab continues with Type.
  useEffect(() => {
    if (!initial) return;
    formRef.current?.scrollIntoView({ block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [initial]);

  async function onSubmit(values: DiscountCodeInput) {
    setFormError(null);
    const result = await saveDiscountCodeAction(values);
    if (!result.ok) {
      const fields = result.error.fields ?? {};
      const known = (
        ["code", "percentOff", "amountOffPaisa", "minSubtotalPaisa", "endsOn", "maxUses"] as const
      )
        .filter((name) => fields[name])
        .map((name) => form.setError(name, { message: fields[name] }, { shouldFocus: true }));
      if (known.length === 0) setFormError(messageFor(result.error));
      return;
    }
    toast.success("Discount code saved");
    form.reset(EMPTY);
    onDone();
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      aria-labelledby="discount-form-heading"
      className="grid scroll-mt-4 gap-4 rounded-md border border-line p-5 sm:grid-cols-2"
    >
      <h2
        id="discount-form-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-h3 focus:outline-none sm:col-span-2"
      >
        {initial ? `Edit ${initial.code}` : "Add a discount code"}
      </h2>
      {formError && (
        <Alert variant="danger" className="sm:col-span-2">
          {formError}
        </Alert>
      )}
      <FormField
        label="Code"
        required={!initial}
        error={errors.code?.message}
        helper={
          initial
            ? "A code can't be changed once it's made."
            : "Letters, numbers and hyphens, e.g. WELCOME10. Customers can type it in any case."
        }
      >
        <Input
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          readOnly={Boolean(initial)}
          {...form.register("code")}
        />
      </FormField>
      <FormField label="Type" required={!initial} error={errors.kind?.message}>
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <RadioGroup
              ref={field.ref}
              variant="segmented"
              value={field.value}
              disabled={Boolean(initial)}
              onValueChange={(value) => field.onChange(value)}
            >
              <RadioGroupItem value="PERCENT" label="Percentage" />
              <RadioGroupItem value="FIXED" label="Fixed amount" />
            </RadioGroup>
          )}
        />
      </FormField>
      {kind === "PERCENT" ? (
        <FormField
          label="Percentage off"
          required={!initial}
          error={errors.percentOff?.message}
          helper={initial ? AMOUNT_FIXED : undefined}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            readOnly={Boolean(initial)}
            {...form.register("percentOff", { setValueAs: optionalNumber })}
          />
        </FormField>
      ) : (
        <FormField
          label="Amount off (Rs)"
          required={!initial}
          error={errors.amountOffPaisa?.message}
          helper={initial ? AMOUNT_FIXED : undefined}
        >
          <Controller
            control={form.control}
            name="amountOffPaisa"
            render={({ field }) => (
              <RupeesInput
                ref={field.ref}
                name={field.name}
                value={field.value}
                readOnly={Boolean(initial)}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
              />
            )}
          />
        </FormField>
      )}
      <FormField label="Minimum order (Rs)" helper="Optional" error={errors.minSubtotalPaisa?.message}>
        <Controller
          control={form.control}
          name="minSubtotalPaisa"
          render={({ field }) => (
            <RupeesInput
              ref={field.ref}
              name={field.name}
              value={field.value}
              onBlur={field.onBlur}
              // Blank means no minimum.
              onValueChange={(paisa) => field.onChange(Number.isNaN(paisa) ? undefined : paisa)}
            />
          )}
        />
      </FormField>
      <FormField
        label="Ends on"
        helper="Optional. The code works until the end of that day."
        error={errors.endsOn?.message}
      >
        <Input type="date" {...form.register("endsOn")} />
      </FormField>
      <FormField
        label="Total uses"
        helper="Optional. Leave blank for no limit."
        error={errors.maxUses?.message}
      >
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          {...form.register("maxUses", { setValueAs: optionalNumber })}
        />
      </FormField>
      <div className="flex flex-col sm:col-span-2">
        <Controller
          control={form.control}
          name="oncePerCustomer"
          render={({ field }) => (
            <Switch
              label="Once per customer"
              description="Each customer can use it on one order."
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Switch
              label="Active"
              description="Switch it off to stop the code working."
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" shape="pill" loading={isSubmitting}>
          {initial ? "Save" : "Add code"}
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

function Conditions({ row }: { row: DiscountRow }) {
  const parts: { key: string; node: React.ReactNode }[] = [];
  if (row.minSubtotalPaisa !== null)
    parts.push({
      key: "min",
      node: (
        <>
          Min <Price paisa={row.minSubtotalPaisa} />
        </>
      ),
    });
  if (row.endsOn) parts.push({ key: "ends", node: `Ends ${endsOnLabel(row.endsOn)}` });
  if (row.oncePerCustomer) parts.push({ key: "once", node: "Once per customer" });
  parts.push({
    key: "uses",
    node: row.maxUses === null ? `${row.usedCount} used` : `${row.usedCount} of ${row.maxUses} used`,
  });
  return (
    <span className="flex flex-wrap gap-x-2 text-small text-ink-muted">
      {parts.map((part, index) => (
        <span key={part.key} className="inline-flex gap-x-2">
          {index > 0 && <span aria-hidden>·</span>}
          <span>{part.node}</span>
        </span>
      ))}
    </span>
  );
}

/** /admin/discounts (specs/discount-codes.md): the form above the list, as on Categories and Collections. */
export function DiscountManager({ codes }: { codes: DiscountRow[] }) {
  const [editing, setEditing] = useState<DiscountRow | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnTo = useRef<string | null>(null);

  // Save or Cancel returns focus to that row's Edit button.
  useEffect(() => {
    if (editing || !returnTo.current) return;
    listRef.current?.querySelector<HTMLElement>(`[data-edit-id="${returnTo.current}"]`)?.focus();
    returnTo.current = null;
  }, [editing]);

  function stopEditing() {
    returnTo.current = editing?.id ?? null;
    setEditing(null);
  }

  return (
    <Stack gap={6}>
      <DiscountForm key={editing?.id ?? "new"} initial={editing ?? undefined} onDone={stopEditing} />
      {codes.length === 0 ? (
        <EmptyState
          title="No discount codes yet."
          description="Make one for a launch, a campaign or a first order."
        />
      ) : (
        <ul ref={listRef} className="divide-y divide-line border-y border-line">
          {codes.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 text-body">
                  <span className="font-medium wrap-anywhere">{row.code}</span>
                  <span className="text-ink-muted">
                    {row.kind === "PERCENT" ? (
                      `${row.percentOff ?? 0}% off`
                    ) : (
                      <>
                        <Price paisa={row.amountOffPaisa ?? 0} /> off
                      </>
                    )}
                  </span>
                  <Badge variant={STATUS[row.status].variant}>{STATUS[row.status].label}</Badge>
                </span>
                <Conditions row={row} />
              </span>
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                data-edit-id={row.id}
                aria-label={`Edit ${row.code}`}
                onClick={() => setEditing(row)}
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
}
