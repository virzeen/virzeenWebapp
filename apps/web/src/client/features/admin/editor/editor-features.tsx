"use client";

import { toast } from "@virzeen/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useWatch } from "react-hook-form";
import { ListError } from "../list-error";
import { refocusAfterListChange } from "../form-focus";
import { useProductEditor } from "./editor-context";
import { FeatureAddCard } from "./features-add-card";
import { FeatureCard, type FeatureActions } from "./features-card";
import { featureName, MAX_FEATURES, movedMessage, newFeatureKey } from "./features-cards";
import { FeaturesLayoutPicker } from "./features-layout-picker";
import { FeatureRemoveDialog } from "./features-remove-dialog";
import { FeatureRowsEditor } from "./features-rows-editor";
import { FeatureSortable } from "./features-sortable";
import { useFeatureCards, type FeatureCardView } from "./features-state";

/**
 * "Features that perform" (specs/product-page-v2.md "Editor"): the Layout picker (with the Custom rows editor under
 * it while Custom is picked), then the pictures in a simple grid in list order, 2 a row on phones, 3 at md and 5 from
 * lg, whatever the layout (owner, 2026-09-30: only Preview and the shop show the layout), and the + tile as the last
 * cell. A feature needs only its picture: it's saved as soon as it's uploaded. A picture drags its card to a new place
 * (FeatureSortable; the + tile stays put). Focus follows a card moved with its arrows, goes to a neighbour after
 * Remove, and to a new card's title pencil when it was on the + tile.
 */
export function EditorFeatures() {
  const { form } = useProductEditor();
  const state = useFeatureCards();
  const { errors } = useFormState({ control: form.control, name: "features" });
  const layout = useWatch({ control: form.control, name: "featureLayout" });
  const sectionRef = useRef<HTMLElement>(null);
  const [removing, setRemoving] = useState<FeatureCardView | null>(null);
  const [confirming, setConfirming] = useState(false);
  const focusAfterRemove = useRef<() => HTMLElement | null | undefined>(() => null);
  const lastAdded = useRef<string | null>(null);
  const focusLastAdded = useRef(false);
  // `n` counts drops: the message is keyed by it, so a drop that reads like the last one is still read out.
  const [moved, setMoved] = useState({ text: "", n: 0 });
  // One array per order, so dnd-kit sees the list change only when it does (not on every render).
  const order = state.cards.map((card) => card.key).join(" ");
  const keys = useMemo(() => (order ? order.split(" ") : []), [order]);

  const find = (key: string | null | undefined, selector: string) =>
    key ? sectionRef.current?.querySelector<HTMLElement>(`[data-feature="${key}"] ${selector}`) : null;
  const action = (key: string | undefined, name: string) => find(key, `[data-action="${name}"]`);
  const titlePencil = () => find(lastAdded.current, '[data-part="title"] button');

  // A new card's title pencil takes focus when focus was on the + tile as its picture came in (addPicture checks
  // before the render, when the 9th feature takes the tile away). Several pictures at once: the first new card's.
  useEffect(() => {
    if (!focusLastAdded.current) return;
    focusLastAdded.current = false;
    titlePencil()?.focus();
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

  /**
   * A card dropped on another's place: saved like the arrows, then read out. Focus stays where the drag left it (on
   * the page, after a pointer).
   */
  function drop(key: string, to: number) {
    const card = state.cards.find((each) => each.key === key);
    if (!card || to < 0 || to === card.index) return;
    const problem = state.moveTo(key, to);
    if (problem) return void toast.error(problem);
    const text = movedMessage(featureName(card.title, card.index), to, state.cards.length);
    setMoved((last) => ({ text, n: last.n + 1 }));
  }

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
        sectionRef.current?.querySelector<HTMLElement>("[data-feature-add] button");
    setConfirming(false);
  }

  function addPicture(imageRef: string) {
    const key = newFeatureKey();
    // Read now: an upload can finish after the admin has moved on, and a click on the page leaves focus on body.
    const onTile = document.activeElement?.closest("[data-feature-add]") != null;
    const problem = state.add(key, imageRef);
    // Several pictures in one render: the first one keeps the focus claim.
    if (!problem && !focusLastAdded.current) {
      lastAdded.current = key;
      focusLastAdded.current = onTile;
    }
    return problem;
  }

  const listError = errors.features?.message ?? errors.features?.root?.message;
  const last = state.cards.length - 1;
  return (
    <section
      ref={sectionRef}
      aria-labelledby="editor-features-heading"
      className="flex flex-col gap-6 pt-16 lg:pt-24"
    >
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
          Optional: pictures under the product, each with a title and text if you like. Customers see this
          section once it has one.
        </p>
      )}
      <FeaturesLayoutPicker />
      {layout === "CUSTOM" && <FeatureRowsEditor features={state.cards.length} />}
      {listError && <ListError>{listError}</ListError>}
      <FeatureSortable keys={keys} onDrop={drop}>
        <ul
          aria-labelledby="editor-features-heading"
          className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-5"
        >
          {state.cards.map((card) => {
            const fieldErrors = errors.features?.[card.index];
            return (
              <FeatureCard
                key={card.key}
                card={card}
                first={card.index === 0}
                last={card.index === last}
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
          {state.canAdd && (
            <FeatureAddCard count={state.cards.length} onPicture={addPicture} newCardFocus={titlePencil} />
          )}
        </ul>
      </FeatureSortable>
      <p aria-live="polite" className="sr-only">
        <span key={moved.n}>{moved.text}</span>
      </p>
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
