"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  FormField,
  Input,
  toast,
  Tooltip,
} from "@virzeen/ui";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { setPublicAtAction } from "@/server/actions/admin/catalog";

type EarlyAccessButtonProps = {
  id: string;
  productName: string;
  /** When the public may see the product (ISO), or null. */
  publicAt: string | null;
};

/** The value a `datetime-local` field takes: the browser's local time as "YYYY-MM-DDTHH:mm". */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Early access for one product (specs/member-perks.md): the time the public may see it. Until then only members can,
 * MONO Members from 12 hours before and Pass members from 48 hours before. Leave it empty for no wait.
 */
export function EarlyAccessButton({ id, productName, publicAt }: EarlyAccessButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toLocalInput(publicAt));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(next: string) {
    setError(null);
    startTransition(async () => {
      const result = await setPublicAtAction({ id, publicAt: next ? new Date(next).toISOString() : null });
      if (!result.ok) return setError(result.error.fields?.publicAt ?? messageFor(result.error));
      toast.success(next ? "Public time saved" : "Public time cleared");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValue(toLocalInput(publicAt));
        setError(null);
      }}
    >
      <Tooltip content="Early access">
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Early access for ${productName}`}>
            <Clock className="size-4" strokeWidth={1.5} aria-hidden />
          </Button>
        </DialogTrigger>
      </Tooltip>
      <DialogContent
        title="Early access"
        description={`${productName}. Members see it before this time: MONO Members 12 hours early, Pass members 48 hours early.`}
      >
        {error && <Alert variant="danger">{error}</Alert>}
        <FormField label="Public from" helper="Leave empty to show it to everyone now.">
          <Input type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} />
        </FormField>
        <DialogFooter>
          {publicAt && (
            <Button variant="secondary" shape="pill" disabled={isPending} onClick={() => save("")}>
              Clear
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="secondary" shape="pill">
              Cancel
            </Button>
          </DialogClose>
          <Button shape="pill" loading={isPending} onClick={() => save(value)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
