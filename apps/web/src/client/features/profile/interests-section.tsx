"use client";

import { Button, Checkbox, Dialog, DialogClose, DialogContent, DialogFooter, Link, toast } from "@virzeen/ui";
import { MAX_INTERESTS } from "@virzeen/validators/limits";
import { CirclePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { messageFor } from "@/client/lib/error-messages";
import { saveInterestsAction } from "@/server/actions/account";

type Choice = { id: string; slug: string; name: string };
type Option = Choice & { imageUrl: string | null; imageAlt: string };
type Saved = { collections: Choice[] };
type Options = { collections: Option[] };

type InterestsSectionProps = {
  /** What the member saved. */
  interests: Saved;
  /** What they can choose from in the dialog, each with a photo when it has one. */
  options: Options;
};

const idsKey = (ids: string[]) => [...ids].sort().join(",");

/**
 * The profile's "Your picks" block, laid out like Nike's Interests (specs/member-area-nike-layout.md): the title with
 * "Edit", a line of help and a row of square tiles: one per saved pick, then an "Add picks" tile (the only one while
 * there are none). Add and Edit open "Select your picks", Nike's list: a row per live collection (a photo, the name
 * and a box on the right, a hairline between rows), up to 12 in all. Categories and collections are one thing now
 * (specs/catalog-groups-visibility.md), so there are no tabs. Saving replaces the set, then refreshes the profile,
 * whose "Find your next favourite" row follows the picks.
 */
export function InterestsSection({ interests, options }: InterestsSectionProps) {
  const router = useRouter();
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const saved = interests.collections.map((row) => row.id);
  const [collectionIds, setCollectionIds] = useState<string[]>(saved);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = idsKey(collectionIds) !== idsKey(saved);
  const total = collectionIds.length;

  function openDialog() {
    // Start from what is saved, so a cancelled change does not linger.
    setCollectionIds(saved);
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveInterestsAction({ collectionIds });
      if (!result.ok) return setError(messageFor(result.error));
      toast.success("Picks saved");
      setOpen(false);
      router.refresh();
    });
  }

  const tiles = interests.collections.map((row) => ({ ...row, href: `/collections/${row.slug}` }));
  const rows = options.collections.map((row) => ({
    ...row,
    chosen: collectionIds.includes(row.id),
    toggle: (on: boolean) =>
      setCollectionIds((ids) => (on ? [...ids, row.id] : ids.filter((id) => id !== row.id))),
  }));

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6" data-testid="interests">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h2 id={headingId} className="font-display text-h2">
          Your picks
        </h2>
        <Button variant="link" onClick={openDialog}>
          Edit
        </Button>
      </div>

      <p className="text-body">Pick the collections you love, and we will line up products to match.</p>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-label="Your saved picks">
        {tiles.map((tile) => (
          <li key={tile.id}>
            <Link
              href={tile.href}
              variant="subtle"
              className="flex aspect-square flex-col justify-end gap-1 rounded-none bg-surface p-4 text-ink hover:bg-line"
              data-testid="interest-tile"
            >
              <span className="font-display text-h3">{tile.name}</span>
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={openDialog}
            className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-none bg-surface text-ink transition-colors duration-150 ease-standard hover:bg-line"
            data-testid="add-interests"
          >
            <CirclePlus className="size-6" strokeWidth={1.5} aria-hidden />
            <span className="text-body">Add picks</span>
          </button>
        </li>
      </ul>

      <Dialog open={open} onOpenChange={(next) => (next ? openDialog() : setOpen(false))}>
        <DialogContent
          size="picker"
          title="Select your picks"
          footer={
            <DialogFooter>
              <p className="text-small text-ink-muted sm:mr-auto sm:self-center" aria-live="polite">
                {total} of {MAX_INTERESTS} chosen
              </p>
              <DialogClose asChild>
                <Button variant="secondary" shape="pill">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                shape="pill"
                loading={isPending}
                disabled={!dirty || total > MAX_INTERESTS}
                onClick={save}
              >
                Save
              </Button>
            </DialogFooter>
          }
        >
          {error && (
            <p role="alert" className="py-2 text-body text-danger">
              {error}
            </p>
          )}
          <ul className="flex flex-col">
            {rows.map((row) => (
              <li key={row.id} className="border-b border-line last:border-b-0">
                <Checkbox
                  boxAtEnd
                  label={row.name}
                  checked={row.chosen}
                  disabled={!row.chosen && total >= MAX_INTERESTS}
                  onCheckedChange={(value) => row.toggle(value === true)}
                  media={
                    row.imageUrl ? (
                      <CloudImage
                        src={row.imageUrl}
                        alt=""
                        ratio="square"
                        sizes="80px"
                        className="size-20 shrink-0 rounded-none"
                      />
                    ) : (
                      <span aria-hidden className="size-20 shrink-0 bg-surface" />
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
}
