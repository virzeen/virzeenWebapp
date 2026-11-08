import { SettingsNav } from "./settings-nav";

type SettingsShellProps = {
  /** The section's h2, e.g. "Account details". */
  title: string;
  children: React.ReactNode;
};

/**
 * Settings laid out like Nike's (owner 2026-11-08): "Settings" as the h1 over a list of sections on the left (Account
 * details, Delivery addresses), the open section on the right with its heading. One column on phones.
 */
export function SettingsShell({ title, children }: SettingsShellProps) {
  return (
    <div className="grid gap-10 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-x-16 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-8 md:gap-12">
        <h1 className="font-display text-h2">Settings</h1>
        <SettingsNav />
      </div>
      <section aria-labelledby="settings-section" className="flex max-w-xl flex-col gap-8 md:pt-20">
        <h2 id="settings-section" className="font-display text-h2">
          {title}
        </h2>
        {children}
      </section>
    </div>
  );
}
