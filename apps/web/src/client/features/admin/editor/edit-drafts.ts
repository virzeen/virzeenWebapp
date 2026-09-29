"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

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

/**
 * Work kept outside the form until it's complete (a new feature card): each holder reports under its own id, and
 * the editor's one leave check asks while any holds some. `holdUnsaved` is stable.
 */
export function useHeldWork() {
  const [held, setHeld] = useState<ReadonlySet<string>>(() => new Set());
  const holdUnsaved = useCallback((id: string, unsaved: boolean) => {
    setHeld((was) => {
      if (was.has(id) === unsaved) return was;
      const next = new Set(was);
      if (unsaved) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  return { holding: held.size > 0, holdUnsaved };
}
