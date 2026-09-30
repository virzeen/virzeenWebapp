"use client";

import {
  Badge,
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@virzeen/ui";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trash2 } from "lucide-react";
import { useRef } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { refocusAfterListChange } from "../form-focus";

type MediaActionsProps = {
  /** The shown photo's place in the gallery (0 = the main photo) and how many there are. */
  position: number;
  count: number;
  /** "photo 2", or "Black photo 2" with styles: names the buttons for screen readers. */
  name: string;
  url: string;
  /** "vertical": beside the thumbnail strip (up and down arrows); "horizontal": under the phone carousel. */
  direction: "vertical" | "horizontal";
  /** Classes for the Make main / Main photo part and for the arrows and Remove (placed separately on the photo). */
  mainClassName?: string;
  toolsClassName?: string;
  onMove: (from: number, to: number) => void;
  onRemove: (position: number) => void;
  /** Focus goes here (its visible "Add photos") once the last photo is removed. */
  root: React.RefObject<HTMLElement | null>;
};

const visibleAddPhotos = (root: HTMLElement | null) =>
  [...(root?.querySelectorAll<HTMLElement>("[data-add-photos]") ?? [])].find(
    (el) => el.offsetParent !== null,
  );

/**
 * What can be done to the photo on show (specs/product-editor-on-page.md "Gallery"): Make main ("Main photo" on the
 * first), move earlier or later, and Remove (asks first). Every change saves. When the pressed button goes away or
 * can't be pressed any more, focus moves to the other arrow.
 */
export function MediaActions(props: MediaActionsProps) {
  const { position, count, name, url, direction, onMove, onRemove, root } = props;
  const toolsRef = useRef<HTMLDivElement>(null);
  const removed = useRef(false);
  const tool = (action: string) => () =>
    toolsRef.current?.querySelector<HTMLElement>(`[data-action="${action}"]`);
  const Earlier = direction === "vertical" ? ArrowUp : ArrowLeft;
  const Later = direction === "vertical" ? ArrowDown : ArrowRight;

  function move(to: number) {
    onMove(position, to);
    refocusAfterListChange(tool(to < position ? "earlier" : "later"), tool("later"), tool("earlier"));
  }

  return (
    <>
      <div className={props.mainClassName}>
        {position === 0 ? (
          <Badge>Main photo</Badge>
        ) : (
          <Button variant="secondary" size="sm" shape="pill" onClick={() => move(0)}>
            Make main
          </Button>
        )}
      </div>
      <div ref={toolsRef} className={cn("flex gap-2", props.toolsClassName)}>
        {count > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label={`Move ${name} earlier`}
              data-action="earlier"
              disabled={position === 0}
              onClick={() => move(position - 1)}
            >
              <Earlier className="size-4" strokeWidth={1.5} aria-hidden />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label={`Move ${name} later`}
              data-action="later"
              disabled={position === count - 1}
              onClick={() => move(position + 1)}
            >
              <Later className="size-4" strokeWidth={1.5} aria-hidden />
            </Button>
          </>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label={`Remove ${name}`}
              data-action="remove"
            >
              <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Remove this photo?"
            description="It comes off the product page straight away."
            media={<CloudImage src={url} alt="" sizes="64px" />}
            onCloseAutoFocus={(event) => {
              if (!removed.current) return;
              removed.current = false;
              // The Remove button now works on the next photo; with none left, Add photos takes focus.
              event.preventDefault();
              requestAnimationFrame(() => (tool("remove")() ?? visibleAddPhotos(root.current))?.focus());
            }}
          >
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Keep</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    removed.current = true;
                    onRemove(position);
                  }}
                >
                  Remove
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
