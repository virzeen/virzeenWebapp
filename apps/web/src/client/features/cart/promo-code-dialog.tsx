"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, DialogContent, FloatingInput, toast } from "@virzeen/ui";
import { discountCodeFormSchema, type DiscountCodeFormInput } from "@virzeen/validators";
import { useForm } from "react-hook-form";
import { previewCheckoutAction } from "@/server/actions/checkout";
import { storePromo } from "@/client/features/checkout/promo-storage";

type PromoCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * "Enter a promo code" popup on the bag page, like Nike's sign-in popup (owner request 2026-11-11): one floating
 * field and "Apply promo code". The server checks the code against the bag (specs/discount-codes.md); the amount
 * comes off in checkout, where the totals are worked out again.
 */
export function PromoCodeDialog({ open, onOpenChange }: PromoCodeDialogProps) {
  const form = useForm<DiscountCodeFormInput>({
    resolver: zodResolver(discountCodeFormSchema),
    defaultValues: { code: "" },
  });
  const { errors, isSubmitting, isValid } = form.formState;

  async function submit(values: DiscountCodeFormInput) {
    const result = await previewCheckoutAction({ discountCode: values.code });
    if (!result.ok) {
      form.setError(
        "code",
        { message: result.error.fields?.discountCode ?? "We couldn't check that code. Try again." },
        { shouldFocus: true },
      );
      return;
    }
    const applied = result.data.discountCode ?? values.code;
    storePromo(applied);
    form.reset({ code: "" });
    onOpenChange(false);
    toast.success("Promo code added. It comes off at checkout.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset({ code: "" });
        onOpenChange(next);
      }}
    >
      <DialogContent
        size="prompt"
        title="Enter a promo code"
        description="Get instant savings on your order"
        className="text-center"
      >
        <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-6 pt-2">
          <FloatingInput
            label="Enter promo code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={40}
            error={errors.code?.message}
            className="text-left"
            {...form.register("code")}
          />
          <Button
            type="submit"
            shape="pill"
            size="lg"
            loading={isSubmitting}
            disabled={!isValid}
            className="w-full"
          >
            Apply promo code
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
