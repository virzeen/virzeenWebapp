"use client";

import { Button, Checkbox, Dialog, DialogClose, DialogContent, DialogFooter, Link, toast } from "@virzeen/ui";
import { MAX_INTERESTS } from "@virzeen/validators/limits";
import { CirclePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { saveInterestsAction } from "@/server/actions/account";

type Choice = { id: string; slug: string; name: string };
type Choices = { categories: Choice[]; collections: Choice[] };

const TABS = [
  { id: "all", label: "All" },
  { id: "categories", label: "Categories" },
  { id: "collections", label: "Collections" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type InterestsSectionProps = {
  /** What the member saved. */
  interests: Choices;
  /** What they can choose from in the dialog. */
  options: Choices;
};

const idsKey = (ids: string[]) => [...ids].sort().join(",");

/**
 * The profile's Interests block, laid out like Nike's (specs/member-area-nike-layout.md): the title with "Edit", the tab
 * row (All, Categories, Collections) over a hairline, a line of help and a row of square tiles: one per saved
 * interest, then an "Add interests" tile (the only one while there are none). Add and Edit open the same dialog: every
 * live category and collection as a checkbox, up to 12 in all. Saving replaces the set, then refreshes the profile,
 * whose "Find your next favourite" row follows the interests.
 */
export function InterestsSection({ interests, options }: InterestsSectionProps) {
  const router = useRouter();
  const headingId = useId();
  const [tab, setTab] = useState<TabId>("all");
  const [open, setOpen] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>(interests.categories.map((row) => row.id));
  const [collectionIds, setCollectionIds] = useState<string[]>(interests.collections.map((row) => row.id));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    idsKey(categoryIds) !== idsKey(interests.categories.map((row) => row.id)) ||
    idsKey(collectionIds) !== idsKey(interests.collections.map((row) => row.id));
  const total = categoryIds.length + collectionIds.length;

  function openDialog() {
    // Start from what is saved, so a cancelled change does not linger.
    setCategoryIds(interests.categories.map((row) => row.id));
    setCollectionIds(interests.collections.map((row) => row.id));
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveInterestsAction({ categoryIds, collectionIds });
      if (!result.ok) return setError(messageFor(result.error));
      toast.success("Interests saved");
      setOpen(false);
      router.refresh();
    });
  }

  const tiles = [
    ...(tab !== "collections"
      ? interests.categories.map((row) => ({ ...row, href: `/shop/${row.slug}`, kind: "Category" }))
      : []),
    ...(tab !== "categories"
      ? interests.collections.map((row) => ({ ...row, href: `/collections/${row.slug}`, kind: "Collection" }))
      : []),
  ];

  const groups = [
    { title: "Categories", rows: options.categories, chosen: categoryIds, set: setCategoryIds },
    { title: "Collections", rows: options.collections, chosen: collectionIds, set: setCollectionIds },
  ];

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6" data-testid="interests">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h2 id={headingId} className="font-display text-h2">
          Interests
        </h2>
        <Button variant="link" onClick={openDialog}>
          Edit
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Interests"
        className="flex scrollbar-none overflow-x-auto border-b border-line"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-11 shrink-0 cursor-pointer border-b-2 px-4 text-body transition-colors duration-150 ease-standard ${
              tab === id ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-body">
        Add your interests to shop a collection of products that are based on what you&apos;re into.
      </p>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-label="Your interests">
        {tiles.map((tile) => (
          <li key={`${tile.kind}-${tile.id}`}>
            <Link
              href={tile.href}
              variant="subtle"
              className="flex aspect-square flex-col justify-end gap-1 rounded-none bg-surface p-4 text-ink hover:bg-line"
              data-testid="interest-tile"
            >
              <span className="text-small text-ink-muted">{tile.kind}</span>
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
            <span className="text-body">Add interests</span>
          </button>
        </li>
      </ul>

      <Dialog open={open} onOpenChange={(next) => (next ? openDialog() : setOpen(false))}>
        <DialogContent
          size="lg"
          title="Your interests"
          description={`Choose up to ${MAX_INTERESTS}. ${total} chosen.`}
          footer={
            <DialogFooter>
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
          <div className="flex flex-col gap-8">
            {error && (
              <p role="alert" className="text-body text-danger">
                {error}
              </p>
            )}
            {groups.map(({ title, rows, chosen, set }) =>
              rows.length === 0 ? null : (
                <fieldset key={title} className="flex flex-col gap-1">
                  <legend className="font-display text-h3">{title}</legend>
                  {rows.map((row) => {
                    const checked = chosen.includes(row.id);
                    return (
                      <Checkbox
                        key={row.id}
                        label={row.name}
                        checked={checked}
                        disabled={!checked && total >= MAX_INTERESTS}
                        onCheckedChange={(value) =>
                          set(value === true ? [...chosen, row.id] : chosen.filter((id) => id !== row.id))
                        }
                      />
                    );
                  })}
                </fieldset>
              ),
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
