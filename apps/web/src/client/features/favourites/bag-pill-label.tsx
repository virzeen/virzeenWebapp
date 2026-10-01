import { CircleCheck } from "lucide-react";

/**
 * The words on a favourite's bag pill (specs/favourites.md "Nike layout"): "Add to bag", or "Added" with a green
 * tick once the bag holds the style. Pressed again it still adds (another piece, or the popup for another size), so
 * screen readers hear "Added to bag. Add another".
 */
export function BagPillLabel({ added }: { added: boolean }) {
  if (!added) return "Add to bag";
  return (
    <>
      {/* A white tick on a green disc: the stroke is the page colour, so only the fill shows as the circle. */}
      <CircleCheck className="size-5 fill-success text-canvas" strokeWidth={1.5} aria-hidden />
      Added<span className="sr-only"> to bag. Add another</span>
    </>
  );
}
