"use client";

import { Button, toast, Tooltip } from "@virzeen/ui";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { duplicateProductAction } from "@/server/actions/admin/catalog";

type DuplicateProductButtonProps = {
  id: string;
  /** In the editor: the copy is made from the saved product, so unsaved changes there would be lost. */
  unsaved?: boolean;
  /** Products list: an icon button named after the product (several share the page), with a tooltip. */
  productName?: string;
};

/** Copies a product as a draft (stock 0, new SKUs) and opens the copy. */
export function DuplicateProductButton({ id, unsaved = false, productName }: DuplicateProductButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function duplicate() {
    if (unsaved && !window.confirm("Duplicate the saved version? Your unsaved changes here will be lost."))
      return;
    startTransition(async () => {
      const result = await duplicateProductAction({ id });
      if (!result.ok) {
        toast.error(messageFor(result.error));
        return;
      }
      toast.success("Copy saved as a draft");
      router.push(`/admin/products/${result.data.id}`);
    });
  }

  const icon = <Copy className="size-4" strokeWidth={1.5} aria-hidden />;
  if (productName) {
    return (
      <Tooltip content="Duplicate as a draft">
        <Button
          variant="ghost"
          size="icon"
          loading={pending}
          aria-label={`Duplicate ${productName}`}
          onClick={duplicate}
        >
          {icon}
        </Button>
      </Tooltip>
    );
  }
  return (
    <Button variant="ghost" size="sm" shape="pill" loading={pending} onClick={duplicate}>
      {icon}
      Duplicate
    </Button>
  );
}
