import { cn, Link } from "@virzeen/ui";
import { ChevronLeft } from "lucide-react";
import { SettingsList, SettingsNav } from "./settings-nav";

type SettingsShellProps = {
  /** The section's h2, e.g. "Account details". */
  title: string;
  /**
   * Phones only (from md every page shows the list on the left and the section on the right): `menu` is the Settings
   * page itself, just the list (and `menuFooter`); `section` is one section's page, with "Settings" to go back.
   */
  mode: "menu" | "section";
  /** Under the phone list on the Settings page (Sign out). */
  menuFooter?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Settings laid out like Nike's (owner 2026-11-08, phones 2026-11-10): from md, "Settings" as the h1 over a list of
 * sections on the left (Account details, Delivery addresses) and the open section on the right with its heading. On
 * phones the Settings page is only the list, full-width rows with chevrons; each section has its own page.
 */
export function SettingsShell({ title, mode, menuFooter, children }: SettingsShellProps) {
  return (
    <div className="grid gap-10 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-x-16 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* A section's page on phones keeps the h1 for screen readers only, and this column takes no room (`contents`). */}
      <div className={cn("flex flex-col gap-8 md:gap-12", mode === "section" && "max-md:contents")}>
        <h1 className={cn("font-display text-h2", mode === "section" && "max-md:sr-only")}>Settings</h1>
        <div className="max-md:hidden">
          <SettingsNav />
        </div>
        {mode === "menu" && (
          <div className="flex flex-col gap-8 md:hidden">
            <SettingsList />
            {menuFooter}
          </div>
        )}
      </div>
      <section
        aria-labelledby="settings-section"
        className={cn("flex max-w-xl flex-col gap-8 md:pt-20", mode === "menu" && "max-md:hidden")}
      >
        {mode === "section" && (
          <Link href="/account/settings" variant="header" className="gap-1 self-start md:hidden">
            <ChevronLeft className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
            Settings
          </Link>
        )}
        <h2 id="settings-section" className="font-display text-h2">
          {title}
        </h2>
        {children}
      </section>
    </div>
  );
}
