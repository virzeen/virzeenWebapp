"use client";

import { useEffect, useRef } from "react";

// Keyboard focus helpers shared by the product and portfolio forms.

/**
 * After a failed save, brings the first problem into view and focus: the first invalid field or list message,
 * else the form's Alert. On a long form the errors are often off-screen, so Save would seem to do nothing.
 * Keyed on react-hook-form's submitCount, which changes in the same render as the errors (client or server).
 */
export function useRevealFirstError(submitCount: number) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    if (submitCount === 0 || !form) return;
    const target =
      form.querySelector<HTMLElement>('[aria-invalid="true"], [data-field-error]') ??
      form.querySelector<HTMLElement>("[data-error-summary]");
    target?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
  }, [submitCount]);
  return formRef;
}

/**
 * For buttons under validate-on-blur fields (Save, Add variant, Add text, Add image): keeps focus in the field
 * until the click lands. Otherwise the field's blur check adds an error line, the button moves before the mouse
 * is released, and the click is lost.
 */
export const keepFocusOnPress = (event: React.MouseEvent) => event.preventDefault();

/** True when the focused control went away (its item moved or was removed) or can no longer be pressed. */
const focusWasLost = () => {
  const active = document.activeElement;
  return active === null || active === document.body || active.matches(":disabled");
};

/** The button marked `data-action={action}` in the list's item at `index`, as the list is rendered now. */
export const itemButton = (list: HTMLElement | null, index: number, action: string) =>
  list?.children.item(index)?.querySelector<HTMLElement>(`[data-action="${action}"]`);

/**
 * Moving or removing a list item (story block, image, variant) re-renders the list, and the pressed button's node
 * is moved or dropped, which takes keyboard focus with it. Once the list has updated, this focuses the first of
 * `targets` that exists and can be pressed, e.g. the same arrow on the moved item, else its other arrow.
 */
export function refocusAfterListChange(...targets: (() => HTMLElement | null | undefined)[]) {
  requestAnimationFrame(() => {
    if (!focusWasLost()) return;
    for (const find of targets) {
      const element = find();
      if (element && !element.matches(":disabled")) return element.focus();
    }
  });
}
