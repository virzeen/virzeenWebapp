"use client";

import { useCallback, useMemo, useState } from "react";
import type { CategoryOption } from "./editor-context";

/**
 * The editor's category list: the page's, plus categories made in the editor ("New category") until the page's list
 * catches up after router.refresh().
 */
export function useAddedCategories(fromPage: readonly CategoryOption[]) {
  const [added, setAdded] = useState<CategoryOption[]>([]);
  const categories = useMemo(
    () => [...fromPage, ...added.filter((category) => !fromPage.some((c) => c.value === category.value))],
    [fromPage, added],
  );
  const addCategory = useCallback(
    (category: CategoryOption) =>
      setAdded((was) => (was.some((c) => c.value === category.value) ? was : [...was, category])),
    [],
  );
  return { categories, addCategory };
}
