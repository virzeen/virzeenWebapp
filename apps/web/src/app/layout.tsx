import { Toaster } from "@virzeen/ui";
import { colors } from "@virzeen/ui/tokens";
import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { ServiceWorker } from "@/client/components/shared/service-worker";
import "./globals.css";

// ◆ Brand fonts are placeholders until the brand guide is final (docs/ui/design-tokens.md §2).
const text = Inter({ subsets: ["latin"], variable: "--font-text-loaded", display: "swap" });
const display = Inter_Tight({ subsets: ["latin"], variable: "--font-display-loaded", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Virzeen — timeless monochromium experience", template: "%s — Virzeen" },
  description:
    "Virzeen: a monochrome fashion label from Nepal. Shop the collection, explore our campaigns and lookbooks.",
  applicationName: "Virzeen",
  openGraph: { type: "website", siteName: "Virzeen", locale: "en_NP" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Virzeen", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: colors.canvas,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${text.variable} ${display.variable}`}>
      <body>
        {children}
        <Toaster />
        <ServiceWorker />
      </body>
    </html>
  );
}
