"use client";

import { Badge, Button, cn } from "@virzeen/ui";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { ListError } from "./list-error";

/** Drag-to-reorder state and handlers, owned by ProductPhotos (positions are within its section). */
export type PhotoDrag = {
  from: number | null;
  at: number | null;
  start: (position: number) => void;
  over: (position: number) => void;
  drop: (position: number) => void;
  end: () => void;
};

export type PhotoMove = "earlier" | "later" | "main";

type PhotoTileProps = {
  url: string;
  position: number;
  count: number;
  /** "photo 2", or "Mountain photo 2" in a style card: names the buttons for screen readers. */
  name: string;
  errors: (string | undefined)[];
  sizes: string;
  className?: string;
  drag: PhotoDrag;
  onMove: (from: number, to: number, action: PhotoMove) => void;
  onRemove: (position: number) => void;
};

/**
 * One photo in ProductPhotos: the picture ("Main photo" on the first), its problems and its buttons.
 * The buttons carry data-action so the list can put focus back on them after a move (refocusAfterListChange).
 */
export function PhotoTile({
  url,
  position,
  count,
  name,
  errors,
  sizes,
  className,
  drag,
  onMove,
  onRemove,
}: PhotoTileProps) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        drag.start(position);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (drag.from === null) return;
        e.preventDefault();
        drag.over(position);
      }}
      onDrop={(e) => {
        if (drag.from === null) return;
        e.preventDefault();
        drag.drop(position);
      }}
      onDragEnd={drag.end}
      className={cn(
        "flex min-w-0 cursor-grab flex-col gap-2 rounded-md",
        drag.from === position && "opacity-50",
        drag.at === position && drag.from !== position && "ring-2 ring-focus ring-offset-2",
        className,
      )}
    >
      <div className="relative">
        <CloudImage src={url} alt="" sizes={sizes} />
        {position === 0 && <Badge className="absolute top-2 left-2">Main photo</Badge>}
      </div>
      {errors.filter(Boolean).map((message) => (
        <ListError key={message}>{message}</ListError>
      ))}
      <div className="flex flex-wrap items-center gap-1">
        {position > 0 && (
          <Button
            variant="ghost"
            size="sm"
            shape="pill"
            data-action="main"
            onClick={() => onMove(position, 0, "later")}
          >
            Make main
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Move ${name} earlier`}
          data-action="earlier"
          disabled={position === 0}
          onClick={() => onMove(position, position - 1, "earlier")}
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Move ${name} later`}
          data-action="later"
          disabled={position === count - 1}
          onClick={() => onMove(position, position + 1, "later")}
        >
          <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${name}`}
          data-action="remove"
          onClick={() => onRemove(position)}
        >
          <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
        </Button>
      </div>
    </li>
  );
}
