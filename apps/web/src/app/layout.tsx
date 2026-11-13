import { Toaster } from "@virzeen/ui";
import { colors } from "@virzeen/ui/tokens";
import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, Noto_Sans_Devanagari } from "next/font/google";
import { ThemeColorSync } from "@/client/components/layout/theme-color-sync";
import { PrefetchOnIntent } from "@/client/components/shared/prefetch-on-intent";
import { ServiceWorker } from "@/client/components/shared/service-worker";
import { ResumeSignIn } from "@/client/features/auth/resume-sign-in";
import "./globals.css";

// ◆ Brand fonts are placeholders until the brand guide is final (docs/ui/design-tokens.md §2).
const text = Inter({ subsets: ["latin"], variable: "--font-text-loaded", display: "swap" });
const display = Inter_Tight({ subsets: ["latin"], variable: "--font-display-loaded", display: "swap" });
// Only for the rupee sign "रु" (owner request 2026-11-11: bold, then a bit lighter): one weight (Bold).
const rupee = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["600"],
  variable: "--font-rupee-loaded",
  display: "swap",
  preload: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Virzeen — timeless monochromium experience", template: "%s — Virzeen" },
  description:
    "Virzeen: a monochrome fashion label from Nepal. Black and white, aesthetic pieces with free delivery on larger orders across Nepal and cash on delivery.",
  applicationName: "Virzeen",
  openGraph: { type: "website", siteName: "Virzeen", locale: "en_NP" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Virzeen", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: colors.canvas,
  width: "device-width",
  initialScale: 1,
  // The page is drawn under the iPhone status bar and notch (the header and bars add the safe-area insets), so the
  // strip at the very top shows the page's own colour, black over the home hero and white elsewhere.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${text.variable} ${display.variable} ${rupee.variable}`}>
      <body>
        {children}
        <ThemeColorSync />
        <Toaster />
        <ServiceWorker />
        <PrefetchOnIntent />
        <ResumeSignIn />
      </body>
    </html>
  );
}
