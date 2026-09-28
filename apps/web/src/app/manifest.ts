import { colors } from "@virzeen/ui/tokens";
import type { MetadataRoute } from "next";

// Installable PWA (performance-seo.md §4). Colours come from the design tokens.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Virzeen",
    short_name: "Virzeen",
    description: "timeless monochromium experience.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: colors.canvas,
    theme_color: colors.canvas,
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
