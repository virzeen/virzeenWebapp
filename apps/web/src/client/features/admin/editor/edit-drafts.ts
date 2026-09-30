"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Fields open in place whose text couldn't be saved (EditableText, EditableSelect): each reports its problem under
 * its own id, and null once it is saved, cancelled or gone. The product editor shows "Fix the highlighted field to
 * save" and asks before leaving while any is open with a problem. Optional: without a provider nothing is reported.
 */
export type EditDrafts = { report: (id: string, problem: string | null) => void };

export const EditDraftsContext = createContext<EditDrafts | null>(null);

export const useEditDrafts = () => useContext(EditDraftsContext);

/** The provider's side: the registry to put in EditDraftsContext, and the first open problem (if any). */
export function useDraftProblems() {
  const [problems, setProblems] = useState<Record<string, string>>({});
  const drafts = useMemo<EditDrafts>(
    () => ({
      report: (id, problem) =>
        setProblems((was) => {
          if ((was[id] ?? null) === problem) return was;
          const next = { ...was };
          if (problem === null) delete next[id];
          else next[id] = problem;
          return next;
        }),
    }),
    [],
  );
  return { drafts, openProblem: Object.values(problems)[0] };
}
