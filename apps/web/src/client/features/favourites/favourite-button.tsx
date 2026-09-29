"use client";

import { Button, cn, toast } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFavourites } from "./favourites-provider";

type FavouriteButtonProps = {
  productId: string;
  /** The picked style (variant colour); "" for a product without styles. */
  color: string;
  /** Admin preview: only says nothing was saved. */
  preview?: boolean;
};

/** "Favourite" under Add to bag (specs/favourites.md): saves the product in the style picked now. */
export function FavouriteButton({ productId, color, preview = false }: FavouriteButtonProps) {
  const { isSaved, toggle } = useFavourites();
  const router = useRouter();
  const saved = !preview && isSaved(productId, color);

  async function press() {
    if (preview) {
      toast.message("This is a preview. Nothing was saved.");
      return;
    }
    const now = await toggle(productId, color);
    if (now === true) {
      toast.success("Added to favourites", {
        action: { label: "View", onClick: () => router.push("/favourites") },
      });
    } else if (now === false) {
      toast.message("Removed from favourites");
    }
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      shape="pill"
      className="w-full"
      aria-pressed={saved}
      onClick={() => void press()}
    >
      <Heart className={cn("size-5", saved && "fill-current")} strokeWidth={1.5} aria-hidden />
      {saved ? "Favourited" : "Favourite"}
    </Button>
  );
}
