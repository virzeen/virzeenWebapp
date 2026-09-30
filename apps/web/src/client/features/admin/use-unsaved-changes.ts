"use client";

import { useEffect } from "react";

export const LEAVE_WITHOUT_SAVING = "Leave without saving? Your changes will be lost.";

/**
 * While `unsaved` is true, asks before the page goes away: reload or closing the tab (the browser's own prompt) and
 * links on the page, including the admin menu. Browser Back inside the admin isn't covered (Next.js has no hook).
 */
export function useUnsavedChanges(unsaved: boolean) {
  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    // Capture phase on document: runs before Next.js <Link> handles the click in React.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // opens a new tab
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download"))
        return;
      if (window.confirm(LEAVE_WITHOUT_SAVING)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [unsaved]);
}
