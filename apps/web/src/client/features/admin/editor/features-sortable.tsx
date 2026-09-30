"use client";

import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, useSyncExternalStore } from "react";

/**
 * Drag to reorder the editor's feature pictures (specs/product-page-v2.md "Drag to reorder"), with dnd-kit: native
 * HTML drag and drop has no touch support. A mouse drags once it has moved 8px, so a click on a picture's buttons
 * stays a click; a finger presses and holds for 250ms first, so a swipe still scrolls the page. MouseSensor, not
 * PointerSensor: PointerSensor also takes touch and would start before the press and hold. No keyboard sensor: Move
 * earlier / Move later are the keyboard and screen reader way (WCAG 2.5.7), so the cards add no tab stops.
 */

/** dnd-kit's own live region is assertive; the editor says "Moved {name}…" in its own polite one instead. */
const SILENT: Announcements = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

type FeatureSortableProps = {
  /** The cards' stable keys, in list order (the + tile isn't one: it never drags and takes no drop). */
  keys: string[];
  /** A card dropped on another's place (`to` is -1 for a place outside the list). */
  onDrop: (key: string, to: number) => void;
  children: React.ReactNode;
};

/** The drag and drop around the features grid. Each card inside it calls useSortableFeature. */
export function FeatureSortable({ keys, onDrop, children }: FeatureSortableProps) {
  const id = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements: SILENT }}
      onDragEnd={({ active, over }) => {
        if (over) onDrop(String(active.id), keys.indexOf(String(over.id)));
      }}
    >
      <SortableContext items={keys} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
function watchReduceMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCE_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const useReducedMotion = () =>
  useSyncExternalStore(
    watchReduceMotion,
    () => window.matchMedia(REDUCE_MOTION).matches,
    () => false,
  );

/**
 * dnd-kit's press handlers minus presses on the picture's own buttons (they click, never drag) and on anything
 * portalled out of the picture (the Image reference popover), whose events still bubble to it through React.
 */
function pictureOnly(listeners: DraggableSyntheticListeners) {
  if (!listeners) return undefined;
  const handlers: NonNullable<DraggableSyntheticListeners> = {};
  for (const [name, handler] of Object.entries(listeners)) {
    handlers[name] = (event: React.SyntheticEvent<HTMLElement>) => {
      const target = event.target as Element;
      if (event.currentTarget.contains(target) && !target.closest("button, input")) handler(event);
    };
  }
  return handlers;
}

/** How a card's picture drags: `ref` and `listeners` go on the picture's box; `lifted` while it is dragged. */
export type FeatureDragHandle = {
  ref: (node: HTMLElement | null) => void;
  listeners: DraggableSyntheticListeners;
  lifted: boolean;
};

/**
 * One card of FeatureSortable, by its stable key. `setItemRef` and `moving` go on the list item: while a card is
 * dragged the others make room (a transform, animated unless the viewer asks for reduced motion). `handle` is for the
 * picture, or null when dragging is off (a single feature has nowhere to go, like its disabled arrows). dnd-kit's
 * attributes (tabindex, role) are left off on purpose: the card is no extra tab stop.
 */
export function useSortableFeature(key: string, disabled: boolean) {
  const reduceMotion = useReducedMotion();
  const sortable = useSortable({
    id: key,
    disabled,
    transition: reduceMotion ? null : { duration: 200, easing: "var(--ease-standard)" },
  });
  const handle: FeatureDragHandle | null = disabled
    ? null
    : {
        ref: sortable.setActivatorNodeRef,
        listeners: pictureOnly(sortable.listeners),
        lifted: sortable.isDragging,
      };
  return {
    setItemRef: sortable.setNodeRef,
    // Where dnd-kit has the card while sorting (a position, not a look), so it can only be set on the element.
    moving: { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition },
    dragging: sortable.isDragging,
    handle,
  };
}
