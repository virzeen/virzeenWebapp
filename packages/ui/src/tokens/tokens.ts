// Token values for places that can't read CSS variables: emails (React Email) and the PWA manifest.
// Must match tokens.css exactly (docs/ui/design-tokens.md).

export const colors = {
  ink: "#141414",
  inkMuted: "#666666",
  canvas: "#ffffff",
  surface: "#f5f5f5",
  line: "#e5e5e5",
  lineStrong: "#8a8a8a",
  accent: "#231f20",
  accentContrast: "#ffffff",
  success: "#2e7d4f",
  warning: "#8a5a00",
  danger: "#b3261e",
  focus: "#2f6feb",
} as const;

export const fontStack = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/** Tailwind config for React Email's <Tailwind>, so email templates use the same token class names. */
export const emailTailwindConfig = {
  theme: {
    extend: {
      colors: {
        ink: colors.ink,
        "ink-muted": colors.inkMuted,
        canvas: colors.canvas,
        surface: colors.surface,
        line: colors.line,
        accent: colors.accent,
        "accent-contrast": colors.accentContrast,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
      },
      fontFamily: { text: fontStack, display: fontStack },
      fontSize: {
        h1: ["28px", { lineHeight: "1.2" }],
        h2: ["22px", { lineHeight: "1.3" }],
        body: ["16px", { lineHeight: "1.6" }],
        small: ["14px", { lineHeight: "1.5" }],
        caption: ["12px", { lineHeight: "1.4", letterSpacing: "0.08em" }],
      },
      borderRadius: { sm: "4px", md: "8px" },
    },
  },
} as const;
