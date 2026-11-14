import { FormField, Input, Link } from "@virzeen/ui";
import { formatDate } from "@/client/lib/format";

/**
 * Under the name and email on Account details, like Nike's (specs/member-area-nike-layout.md): a Password row with an
 * "Edit" link (not for admins, who sign in with a code and the authenticator) and the date of birth, locked once set.
 */
export function AccountDetailsExtras({
  birthday,
  showPassword,
}: {
  /** "YYYY-MM-DD" or null. */
  birthday: string | null;
  showPassword: boolean;
}) {
  return (
    <div className="flex max-w-md flex-col gap-6">
      {showPassword && (
        <div className="flex items-center justify-between gap-4 border-y border-line py-3">
          <div className="flex flex-col">
            <span className="text-small text-ink-muted">Password</span>
            <span aria-hidden className="text-body tracking-widest">
              ••••••••
            </span>
          </div>
          <Link href="/account/settings/password" variant="default">
            Edit
          </Link>
        </div>
      )}
      <FormField
        label="Date of birth"
        helper={
          birthday
            ? "Your birthday can't be changed."
            : "Add it on the Membership page to get your birthday reward."
        }
      >
        <Input value={birthday ? formatDate(new Date(`${birthday}T00:00:00.000Z`)) : ""} readOnly disabled />
      </FormField>
    </div>
  );
}
