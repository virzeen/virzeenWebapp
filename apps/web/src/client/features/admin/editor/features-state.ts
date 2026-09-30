"use client";

import { useEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { useProductEditor } from "./editor-context";
import {
  featurePartProblem,
  MAX_FEATURES,
  moveKeyed,
  newFeature,
  newFeatureKey,
  partChanges,
  removeAt,
  type Feature,
  type FeaturePart,
} from "./features-cards";

/** One card on the page: a feature and its place in the form's `features`. */
export type FeatureCardView = {
  key: string;
  index: number;
  title: string;
  body: string;
  imageUrl: string;
  alt: string;
};

/**
 * "Features that perform" in the editor: the form's `features`, each with a stable key. A feature needs only its
 * picture (specs/product-page-v2.md), so a new one joins the list as soon as its picture is in. Every change goes
 * through commitFields (checked, then saved). Each handler returns the problem to show, or null.
 */
export function useFeatureCards() {
  const { form, commitFields } = useProductEditor();
  const features = useWatch({ control: form.control, name: "features" });
  const productName = useWatch({ control: form.control, name: "name" });
  const [keys, setKeys] = useState(() => features.map(() => newFeatureKey()));
  // The list changed length outside these handlers (a reload): fresh keys, so no card keeps another's.
  if (keys.length !== features.length) setKeys(features.map(() => newFeatureKey()));
  // Uploads finish later: they look their card up by key in the list as it is by then.
  const latestKeys = useRef(keys);
  useEffect(() => {
    latestKeys.current = keys;
  });

  function commitList(next: Feature[], nextKeys: string[]) {
    const problem = commitFields([{ name: "features", value: next }]);
    if (!problem) {
      latestKeys.current = nextKeys;
      setKeys(nextKeys);
    }
    return problem;
  }

  /** A dropped card to place `to`; one commit, so autosave runs once. Dropped where it was: nothing happens. */
  function moveTo(key: string, to: number) {
    const moved = moveKeyed(features, keys, key, to);
    return moved ? commitList(moved.list, moved.keys) : null;
  }

  /** Move earlier / Move later. */
  const move = (key: string, by: 1 | -1) => moveTo(key, keys.indexOf(key) + by);

  function remove(key: string) {
    const index = keys.indexOf(key);
    return index < 0 ? null : commitList(removeAt(features, index), removeAt(keys, index));
  }

  /** A new title or text ("" takes it away: both are optional). */
  function edit(key: string, part: FeaturePart, value: string): string | null {
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
    const index = latestKeys.current.indexOf(key);
    return index < 0 ? null : commitFields([{ name: `features.${index}.imageUrl`, value: url }]);
  }

  /** The + box's picture: a new feature keyed `key` at the end, saved straight away (none once the list is full). */
  function add(key: string, url: string) {
    const problem = featurePartProblem("imageUrl", url);
    if (problem) return problem;
    // The upload may finish after other changes: add to the list as it is now.
    const current = form.getValues("features");
    if (current.length >= MAX_FEATURES) return `Add up to ${MAX_FEATURES} features`;
    const known = latestKeys.current.length === current.length;
    const currentKeys = known ? latestKeys.current : current.map(() => newFeatureKey());
    return commitList([...current, newFeature(url)], [...currentKeys, key]);
  }

  const cards: FeatureCardView[] = features.map((feature, index) => ({
    key: keys[index] ?? `feature-at-${index}`,
    index,
    title: feature.title,
    body: feature.body,
    imageUrl: feature.imageUrl,
    alt: feature.alt ?? "",
  }));

  return {
    cards,
    canAdd: features.length < MAX_FEATURES,
    productName,
    move,
    moveTo,
    remove,
    edit,
    editAlt,
    setPicture,
    add,
  };
}
