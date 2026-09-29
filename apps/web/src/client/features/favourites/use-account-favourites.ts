"use client";

import { toast } from "@virzeen/ui";
import type { FavouriteKey } from "@virzeen/validators";
import { useMemo, useState } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { setFavouriteAction } from "@/server/actions/favourites";
import { applyChanges, keyOf, settleChanges, toKey, type FavouriteChange } from "./favourites-store";

/** What a server action "returns" when the request never got there (dropped connection): our side's message. */
export const OFFLINE = { ok: false, error: { code: "INTERNAL", message: "" } } as const;

const NO_CHANGES: ReadonlyMap<string, FavouriteChange> = new Map();

/**
 * A signed-in customer's favourites: the server's list (from the layout) with the presses still being saved on
 * top. Each save refreshes the page, so a server list can arrive while a later press is still on its way; that
 * press stays applied until a server list shows it, instead of flickering back.
 */
export function useAccountFavourites(initialKeys: FavouriteKey[]) {
  const [serverKeys, setServerKeys] = useState(initialKeys);
  const [changes, setChanges] = useState(NO_CHANGES);
  // Fresh server data wins whenever the layout re-renders (React "adjust state when a prop changes" pattern).
  if (initialKeys !== serverKeys) {
    setServerKeys(initialKeys);
    setChanges((current) => settleChanges(current, initialKeys));
  }
  const keys = useMemo(() => applyChanges(serverKeys, changes), [serverKeys, changes]);
  // Removed with a press here, until a server list no longer has them (or the removal failed).
  const removed = useMemo(
    () => new Set([...changes.values()].filter((change) => !change.save).map((change) => keyOf(change.key))),
    [changes],
  );

  /**
   * Saves or removes at once: `save`, or else the opposite of the current state (a Favourite button). Resolves to
   * the new state, or null when it failed (it goes back, with a toast).
   */
  async function toggle(key: FavouriteKey, save?: boolean): Promise<boolean | null> {
    const id = keyOf(key);
    const change: FavouriteChange = {
      key: toKey(key),
      save: save ?? !keys.some((item) => keyOf(item) === id),
      done: false,
    };
    setChanges((current) => new Map(current).set(id, change));
    const result = await setFavouriteAction({ ...change.key, saved: change.save }).catch(() => OFFLINE);
    // Unless another press has changed it since: saved (the next server list takes over), or back as it was.
    setChanges((current) => {
      if (current.get(id) !== change) return current;
      const next = new Map(current);
      if (result.ok) next.set(id, { ...change, done: true });
      else next.delete(id);
      return next;
    });
    if (result.ok) return change.save;
    toast.error(messageFor(result.error));
    return null;
  }

  return { keys, removed, toggle };
}
