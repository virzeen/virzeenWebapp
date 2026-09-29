"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { useProductEditor } from "./editor-context";
import {
  featurePartProblem,
  isComplete,
  MAX_FEATURES,
  moveItem,
  newFeatureKey,
  partChanges,
  removeAt,
  toFeature,
  type Feature,
  type FeaturePart,
  type NewFeature,
} from "./features-cards";

/** One card on the page: a saved feature (its place in the form's `features`) or the new one (index -1). */
export type FeatureCardView = {
  key: string;
  index: number;
  title: string;
  body: string;
  imageUrl: string;
  alt: string;
  isNew: boolean;
};

/**
 * "Features that perform" in the editor: the saved features (the form's `features`, each with a stable key) and at
 * most one new feature, kept here until it has a picture, a title and text, so autosave never sends it half done.
 * Every change to a saved feature goes through commitFields (checked, then saved). Each handler returns the
 * problem to show, or null.
 */
export function useFeatureCards() {
  const { form, commitFields, holdUnsaved } = useProductEditor();
  const holdId = useId();
  const features = useWatch({ control: form.control, name: "features" });
  const productName = useWatch({ control: form.control, name: "name" });
  const [keys, setKeys] = useState(() => features.map(() => newFeatureKey()));
  const [added, setAdded] = useState<NewFeature | null>(null);
  // The list changed length outside these handlers (a reload): fresh keys, so no card keeps another's.
  if (keys.length !== features.length) setKeys(features.map(() => newFeatureKey()));
  // Uploads finish later: they look their card up by key in the list as it is by then.
  const latestKeys = useRef(keys);
  useEffect(() => {
    latestKeys.current = keys;
  });
  // The new feature's picture is only here until it's complete: leaving asks first (the editor's one leave check).
  const unfinished = added !== null;
  useEffect(() => holdUnsaved(holdId, unfinished), [holdUnsaved, holdId, unfinished]);
  useEffect(() => () => holdUnsaved(holdId, false), [holdUnsaved, holdId]);

  function commitList(next: Feature[], nextKeys: string[]) {
    const problem = commitFields([{ name: "features", value: next }]);
    if (!problem) setKeys(nextKeys);
    return problem;
  }

  function move(key: string, by: 1 | -1) {
    const from = keys.indexOf(key);
    if (from < 0) return null;
    return commitList(moveItem(features, from, from + by), moveItem(keys, from, from + by));
  }

  function remove(key: string) {
    if (added?.key === key) {
      setAdded(null);
      return null;
    }
    const index = keys.indexOf(key);
    return index < 0 ? null : commitList(removeAt(features, index), removeAt(keys, index));
  }

  /** A new title or text. The new feature joins the form (and saves) as soon as it's complete. */
  function edit(key: string, part: FeaturePart, value: string): string | null {
    if (added?.key === key) {
      const problem = featurePartProblem(part, value);
      if (problem) return problem;
      const next = { ...added, [part]: value };
      if (!isComplete(next)) {
        setAdded(next);
        return null;
      }
      // Same key: the card stays the same on the page (and keeps focus) once it's saved.
      const failed = commitList([...features, toFeature(next)], [...keys, next.key]);
      if (!failed) setAdded(null);
      return failed;
    }
    const index = keys.indexOf(key);
    const feature = features[index];
    return feature ? commitFields(partChanges(index, feature, part, value, productName)) : null;
  }

  function editAlt(key: string, value: string) {
    const index = keys.indexOf(key);
    return index < 0 ? null : commitFields([{ name: `features.${index}.alt`, value }]);
  }

  /** A card's new picture. Dropped when the card is gone by the time the upload finishes. */
  function setPicture(key: string, url: string) {
    const problem = featurePartProblem("imageUrl", url);
    if (problem) return problem;
    setAdded((was) => (was?.key === key ? { ...was, imageUrl: url } : was));
    const index = latestKeys.current.indexOf(key);
    return index < 0 ? null : commitFields([{ name: `features.${index}.imageUrl`, value: url }]);
  }

  /** The + card's picture: the new feature's card, keyed `key` (none while one is open or the list is full). */
  function start(key: string, url: string) {
    const problem = featurePartProblem("imageUrl", url);
    if (problem) return problem;
    setAdded(
      (was) =>
        was ??
        (form.getValues("features").length < MAX_FEATURES
          ? { key, imageUrl: url, title: "", body: "" }
          : null),
    );
    return null;
  }

  const cards: FeatureCardView[] = features.map((feature, index) => ({
    key: keys[index] ?? `feature-at-${index}`,
    index,
    title: feature.title,
    body: feature.body,
    imageUrl: feature.imageUrl,
    alt: feature.alt ?? "",
    isNew: false,
  }));
  if (added) cards.push({ ...added, index: -1, alt: "", isNew: true });

  return {
    cards,
    /** How many are saved: the new one (if any) comes after them and can't move. */
    savedCount: features.length,
    canAdd: !added && features.length < MAX_FEATURES,
    productName,
    move,
    remove,
    edit,
    editAlt,
    setPicture,
    start,
  };
}
