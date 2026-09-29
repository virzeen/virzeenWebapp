"use client";

import { toast } from "@virzeen/ui";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-hook-form";
import { ListError } from "../list-error";
import { refocusAfterListChange } from "../form-focus";
import { useProductEditor } from "./editor-context";
import { FeatureAddCard } from "./features-add-card";
import { FeatureCard, type FeatureActions } from "./features-card";
import { MAX_FEATURES, newFeatureKey } from "./features-cards";
import { FeatureRemoveDialog } from "./features-remove-dialog";
import { useFeatureCards, type FeatureCardView } from "./features-state";

/**
 * "Features that perform" (specs/product-editor-on-page.md): the shop's cards (product-features.tsx), wrapped into
 * rows so every card can be edited, then a + card that adds one (picture first, then title and text; up to 6). A
 * new feature isn't saved until it's complete. Focus follows a moved card, goes to a neighbour after Remove, and to
 * the new card's title once its picture is in.
 */
export function EditorFeatures() {
  const { form } = useProductEditor();
  const state = useFeatureCards();
  const { errors } = useFormState({ control: form.control, name: "features" });
  const listRef = useRef<HTMLUListElement>(null);
  const [removing, setRemoving] = useState<FeatureCardView | null>(null);
  const [confirming, setConfirming] = useState(false);
  const focusAfterRemove = useRef<() => HTMLElement | null | undefined>(() => null);
  const focusTitleOf = useRef<string | null>(null);

  const find = (key: string | undefined, selector: string) =>
    key ? listRef.current?.querySelector<HTMLElement>(`[data-feature="${key}"] ${selector}`) : null;
  const action = (key: string | undefined, name: string) => find(key, `[data-action="${name}"]`);

  // The + card went away when the new card came: its title's pencil takes focus, unless focus went elsewhere.
  useEffect(() => {
    const pencil = find(focusTitleOf.current ?? undefined, '[data-part="title"] button');
    if (!pencil) return;
    focusTitleOf.current = null;
    if (document.activeElement === null || document.activeElement === document.body) pencil.focus();
  });

  const actions: FeatureActions = {
    edit: state.edit,
    editAlt: state.editAlt,
    setPicture: state.setPicture,
    move(card, by) {
      const problem = state.move(card.key, by);
      if (problem) return void toast.error(problem);
      const [pressed, other] = by < 0 ? ["earlier", "later"] : ["later", "earlier"];
      refocusAfterListChange(
        () => action(card.key, pressed),
        () => action(card.key, other),
      );
    },
    remove(card) {
      focusAfterRemove.current = () => action(card.key, "remove");
      setRemoving(card);
      setConfirming(true);
    },
  };

  function confirmRemove() {
    if (!removing) return;
    const order = state.cards.map((card) => card.key);
    const at = order.indexOf(removing.key);
    const problem = state.remove(removing.key);
    if (problem) toast.error(problem);
    else
      focusAfterRemove.current = () =>
        action(order[at + 1], "remove") ??
        action(order[at - 1], "remove") ??
        listRef.current?.querySelector<HTMLElement>("[data-feature-add] button");
    setConfirming(false);
  }

  function addPicture(imageRef: string) {
    const key = newFeatureKey();
    const problem = state.start(key, imageRef);
    if (!problem) focusTitleOf.current = key;
    return problem;
  }

  const listError = errors.features?.message ?? errors.features?.root?.message;
  return (
    <section aria-labelledby="editor-features-heading" className="flex flex-col gap-6 pt-16 lg:pt-24">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4">
        <h2 id="editor-features-heading" className="font-display text-h2">
          Features that perform
        </h2>
        <p className="text-small text-ink-muted">
          {state.cards.length} of {MAX_FEATURES}
        </p>
      </div>
      {state.cards.length === 0 && (
        <p className="-mt-4 text-small text-ink-muted">
          Optional: cards under the product, each a picture with a short title and text. Customers see this
          row once it has one.
        </p>
      )}
      {listError && <ListError>{listError}</ListError>}
      <ul ref={listRef} className="grid gap-x-4 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {state.cards.map((card, position) => {
          const fieldErrors = card.index >= 0 ? errors.features?.[card.index] : undefined;
          return (
            <FeatureCard
              key={card.key}
              card={card}
              first={position === 0}
              last={position === state.savedCount - 1}
              productName={state.productName}
              errors={{
                title: fieldErrors?.title?.message,
                body: fieldErrors?.body?.message,
                alt: fieldErrors?.alt?.message,
                imageUrl: fieldErrors?.imageUrl?.message,
              }}
              actions={actions}
            />
          );
        })}
        {state.canAdd && <FeatureAddCard onPicture={addPicture} />}
      </ul>
      <FeatureRemoveDialog
        card={removing}
        open={confirming}
        onOpenChange={setConfirming}
        onRemove={confirmRemove}
        focusAfterClose={() => focusAfterRemove.current()}
      />
    </section>
  );
}
