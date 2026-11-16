"use client";

import { useCallback, useMemo, useState } from "react";
import type { CollectionOption } from "./editor-context";

/**
 * The editor's collection list: the page's, plus collections made in the editor ("New collection") until the page's
 * list catches up after router.refresh().
 */
export function useAddedCollections(fromPage: readonly CollectionOption[]) {
  const [added, setAdded] = useState<CollectionOption[]>([]);
  const collections = useMemo(
    () => [...fromPage, ...added.filter((collection) => !fromPage.some((c) => c.id === collection.id))],
    [fromPage, added],
  );
  const addCollection = useCallback(
    (collection: CollectionOption) =>
      setAdded((was) => (was.some((c) => c.id === collection.id) ? was : [...was, collection])),
    [],
  );
  return { collections, addCollection };
}
