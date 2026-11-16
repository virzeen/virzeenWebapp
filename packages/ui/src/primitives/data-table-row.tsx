"use client";

import { cn } from "../lib/cn";

/**
 * A `DataTable` row. With `clickable`, a click anywhere on the row follows the row's first link (the product name,
 * the order number), so the whole row is the target and not only its text. Clicks on the row's own buttons and links,
 * on text being selected, and on dialogs opened from the row are left alone. Keyboard and screen-reader users still
 * use the link itself.
 */
export function DataTableRow({
  clickable,
  className,
  children,
}: {
  clickable?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  function onClick(event: React.MouseEvent<HTMLTableRowElement>) {
    if (!clickable || event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    // Portaled dialogs and sheets bubble their clicks through React to the row; they are not inside it in the page.
    if (!event.currentTarget.contains(target)) return;
    if (target.closest("a, button, input, select, textarea, label, [role=button], [role=switch]")) return;
    if (window.getSelection()?.toString()) return;
    event.currentTarget.querySelector<HTMLAnchorElement>("a[href]")?.click();
  }
  return (
    <tr
      onClick={clickable ? onClick : undefined}
      className={cn(
        "transition-colors duration-150 ease-standard hover:bg-surface",
        clickable && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}
