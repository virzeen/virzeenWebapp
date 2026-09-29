"use client";

import { Toaster as Sonner, toast as sonnerToast } from "sonner";

/**
 * Renders toasts. Mount once in the root layout. Toasts are announced to screen readers (aria-live).
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      closeButton
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        // The background is set per type, not on `toast`: two bg utilities on one element would leave the
        // winner to stylesheet order, and errors came out in ink.
        classNames: {
          toast:
            "z-60 flex w-full items-center gap-3 rounded-md px-4 py-3 font-text text-small text-canvas shadow-md sm:w-96",
          title: "font-medium",
          description: "text-canvas/80",
          default: "bg-ink",
          success: "bg-ink",
          error: "bg-danger",
          actionButton:
            "ml-auto inline-flex min-h-9 items-center rounded-sm px-2 font-medium text-canvas underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
          closeButton:
            "order-last ml-1 inline-flex size-8 items-center justify-center rounded-full text-canvas/80 hover:text-canvas focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
          icon: "hidden",
        },
      }}
    />
  );
}

type ToastOptions = {
  description?: string;
  /** Inline action, e.g. `{ label: "Undo", onClick }` for "Removed from bag". */
  action?: { label: string; onClick: () => void };
  duration?: number;
};

const withAction = (options?: ToastOptions) =>
  options && {
    description: options.description,
    duration: options.duration,
    action: options.action && { label: options.action.label, onClick: options.action.onClick },
  };

/**
 * Feedback after a background action ("Added to bag"). Errors the user must fix go inline
 * (field error or `Alert`), not in a toast. Copy comes from docs/ui/content-style.md.
 */
export const toast = {
  message: (message: string, options?: ToastOptions) => sonnerToast(message, withAction(options)),
  success: (message: string, options?: ToastOptions) => sonnerToast.success(message, withAction(options)),
  error: (message: string, options?: ToastOptions) => sonnerToast.error(message, withAction(options)),
};
