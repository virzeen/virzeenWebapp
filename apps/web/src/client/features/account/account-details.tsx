"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  FloatingInput,
  Link,
  toast,
} from "@virzeen/ui";
import { profileSchema, type ProfileInput } from "@virzeen/validators";
import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { formatDate } from "@/client/lib/format";
import { messageFor } from "@/client/lib/error-messages";
import { deleteAccountAction, updateProfileAction } from "@/server/actions/account";

type AccountDetailsProps = {
  name: string;
  email: string;
  /** "YYYY-MM-DD" or null. */
  birthday: string | null;
  /** Not for admins, who sign in with a code and the authenticator. */
  showPassword: boolean;
  /** Not for admins either: an admin account can't be deleted here. */
  canDelete: boolean;
};

/**
 * Account details laid out like Nike's (specs/member-area-nike-layout.md): outlined floating-label boxes (name, email),
 * a Password row with "Edit", the date of birth (locked), a Location block, a Delete account row with an outlined
 * "Delete" pill between hairlines, and a Save that stays off until the name changes. Deleting asks the member to type
 * DELETE, anonymises the account and returns to the home page.
 */
export function AccountDetails({ name, email, birthday, showPassword, canDelete }: AccountDetailsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name } });
  const { errors, isSubmitting, isDirty } = form.formState;

  async function onSubmit(values: ProfileInput) {
    setFormError(null);
    const result = await updateProfileAction(values);
    if (!result.ok) return setFormError(messageFor(result.error));
    toast.success("Saved");
    form.reset(values);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex max-w-md flex-col gap-6">
      {formError && <Alert variant="danger">{formError}</Alert>}
      <FloatingInput
        label="Name"
        required
        autoComplete="name"
        error={errors.name?.message}
        {...form.register("name")}
      />
      <FloatingInput label="Email" required type="email" value={email} readOnly disabled />

      {showPassword && (
        <div className="flex flex-col gap-2">
          <span className="text-body font-medium">Password</span>
          <div className="flex items-center justify-between gap-4">
            <span aria-hidden className="text-body tracking-widest">
              ••••••••
            </span>
            <Link href="/account/settings/password" variant="default" className="text-small font-medium">
              Edit
            </Link>
          </div>
        </div>
      )}

      <FloatingInput
        label="Date of birth"
        required
        value={birthday ? formatDate(new Date(`${birthday}T00:00:00.000Z`)) : ""}
        readOnly
        disabled
        endAdornment={<CalendarDays className="size-5" strokeWidth={1.5} aria-hidden />}
      />
      {!birthday && (
        <p className="-mt-4 text-small text-ink-muted">
          Add it on the Membership page to get your birthday reward.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <span className="text-body font-medium">Location</span>
        <FloatingInput label="Country/Region" required value="Nepal" readOnly disabled />
      </div>

      {canDelete && (
        <div className="flex items-center justify-between gap-4 border-y border-line py-4">
          <span className="text-body">Delete account</span>
          <DeleteAccount />
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          shape="pill"
          loading={isSubmitting}
          disabled={!isDirty}
          className="disabled:bg-line disabled:text-ink-muted disabled:opacity-100"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

/** The "Delete" pill and its confirmation dialog. */
function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction({ confirm: typed });
      if (!result.ok) return setError(messageFor(result.error));
      // The sessions are gone: a full load of the home page, signed out.
      window.location.assign("/");
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setTyped("");
          setError(null);
        }
      }}
    >
      <Button type="button" variant="secondary" shape="pill" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <DialogContent
        title="Delete your account?"
        description="This signs you out and removes your details, addresses, favourites and reviews. Orders you have placed stay in our records. This can't be undone."
      >
        <div className="flex flex-col gap-4">
          {error && <Alert variant="danger">{error}</Alert>}
          <FloatingInput
            label="Type DELETE to confirm"
            autoComplete="off"
            autoCapitalize="characters"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" shape="pill">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            shape="pill"
            loading={isPending}
            disabled={typed !== "DELETE"}
            onClick={confirm}
          >
            Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
