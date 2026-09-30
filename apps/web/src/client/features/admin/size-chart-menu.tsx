"use client";

import { Button, Popover, PopoverContent, PopoverTrigger } from "@virzeen/ui";
import { EllipsisVertical, type LucideIcon } from "lucide-react";
import { useState } from "react";

export type SizeChartMenuAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
};

type SizeChartMenuProps = {
  /** The button's name and the panel's, e.g. "Move or remove Chest". */
  label: string;
  /** Finds the button again after a change ("column:2", "row:0"): `data-chart-menu`. */
  menuId: string;
  actions: SizeChartMenuAction[];
};

/**
 * The small menu on each column and row of the size table: a round ⋮ button opening a Popover with Move left / Move
 * right / Remove (or up / down). Picking one closes it; focus goes back to the button (it moves with its column or
 * row), and the table moves it on when the button itself is gone.
 */
export function SizeChartMenu({ label, menuId, actions }: SizeChartMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" shape="pill" aria-label={label} data-chart-menu={menuId}>
          <EllipsisVertical className="size-4" strokeWidth={1.5} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label={label} align="end" className="w-56">
        <ul className="flex flex-col gap-1">
          {actions.map(({ label: actionLabel, icon: Icon, onSelect, disabled }) => (
            <li key={actionLabel}>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false);
                  onSelect();
                }}
              >
                <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                {actionLabel}
              </Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
