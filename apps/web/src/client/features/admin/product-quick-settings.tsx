"use client";

import {
  Alert,
  Button,
  ButtonLink,
  FormField,
  Input,
  Sheet,
  SheetContent,
  SheetTrigger,
  toast,
  Tooltip,
} from "@virzeen/ui";
import type { Audience } from "@virzeen/validators";
import { Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { setProductVisibilityAction } from "@/server/actions/admin/catalog";
import { ArchiveButton } from "./archive-button";
import { AudienceField } from "./audience-field";
import { DuplicateProductButton } from "./duplicate-product-button";

type ProductQuickSettingsProps = {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  audience: Audience;
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
 * Settings for one product from the products list, in a panel from the right, without opening the product's page:
 * who may see it, when, then Open, View in shop, Duplicate and Delete. The full list of settings stays in the editor.
 */
export function ProductQuickSettings({
  id,
  name,
  slug,
  isPublished,
  audience,
  publicAt,
}: ProductQuickSettingsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<Audience>(audience);
  const [publicLocal, setPublicLocal] = useState(toLocalInput(publicAt));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Start from what is saved each time the panel opens.
      setLevel(audience);
      setPublicLocal(toLocalInput(publicAt));
      setError(null);
    }
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setProductVisibilityAction({
        id,
        audience: level,
        publicAt: publicLocal ? new Date(publicLocal).toISOString() : null,
      });
      if (!result.ok) return setError(result.error.fields?.publicAt ?? messageFor(result.error));
      toast.success("Settings saved");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Tooltip content="Settings">
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Settings for ${name}`}>
            <Settings2 className="size-4" strokeWidth={1.5} aria-hidden />
          </Button>
        </SheetTrigger>
      </Tooltip>
      <SheetContent
        title="Settings"
        description={name}
        footer={
          <Button shape="pill" loading={isPending} onClick={save}>
            Save
          </Button>
        }
      >
        <div className="flex flex-col gap-8">
          {error && <Alert variant="danger">{error}</Alert>}
          <FormField label="Visibility">
            <AudienceField value={level} onChange={setLevel} />
          </FormField>
          <FormField
            label="Public from"
            helper="Early access: MONO Members see it 12 hours before, Pass members 48 hours before. Empty = everyone now."
          >
            <Input
              type="datetime-local"
              value={publicLocal}
              onChange={(event) => setPublicLocal(event.target.value)}
            />
          </FormField>
          <section aria-labelledby={`quick-product-${id}`} className="flex flex-col gap-3">
            <h3 id={`quick-product-${id}`} className="text-body font-medium">
              Product
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <ButtonLink href={`/admin/products/${id}`} variant="secondary" size="sm" shape="pill">
                Open the editor
              </ButtonLink>
              {isPublished && (
                <ButtonLink href={`/product/${slug}`} target="_blank" variant="ghost" size="sm" shape="pill">
                  View in shop
                </ButtonLink>
              )}
              <DuplicateProductButton id={id} />
              <ArchiveButton kind="product" id={id} name={name} label="Delete" />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
