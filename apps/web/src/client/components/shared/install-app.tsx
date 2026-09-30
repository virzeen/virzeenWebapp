"use client";

import { Button, cn, Dialog, DialogClose, DialogContent, DialogFooter } from "@virzeen/ui";
import { EllipsisVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import {
  closeInstallGuide,
  type InstallGuide,
  startInstall,
  useInstallGuide,
  useInstallMode,
} from "@/client/lib/install-app";

const LABEL = "Install the Virzeen app";

const icon = "inline size-5 align-text-bottom";

const STEPS: Record<InstallGuide, { id: string; text: React.ReactNode }[]> = {
  ios: [
    {
      id: "share",
      text: (
        <>
          Tap <strong className="font-medium">Share</strong>{" "}
          <Share className={icon} strokeWidth={1.5} aria-hidden /> in Safari&apos;s toolbar.
        </>
      ),
    },
    {
      id: "add",
      text: (
        <>
          Scroll down and tap <strong className="font-medium">Add to Home Screen</strong>{" "}
          <SquarePlus className={icon} strokeWidth={1.5} aria-hidden />.
        </>
      ),
    },
    {
      id: "done",
      text: (
        <>
          Tap <strong className="font-medium">Add</strong>. Virzeen is now on your home screen.
        </>
      ),
    },
  ],
  android: [
    {
      id: "menu",
      text: (
        <>
          Tap the menu <EllipsisVertical className={icon} strokeWidth={1.5} aria-hidden /> at the top right of
          your browser.
        </>
      ),
    },
    {
      id: "install",
      text: (
        <>
          Tap <strong className="font-medium">Install app</strong> or{" "}
          <strong className="font-medium">Add to Home screen</strong>.
        </>
      ),
    },
    {
      id: "done",
      text: (
        <>
          Tap <strong className="font-medium">Install</strong>. Virzeen is now on your home screen.
        </>
      ),
    },
  ],
};

/**
 * "Install the Virzeen app": the browser's install panel on Android, a short guide on iPhone. Renders nothing on
 * computers and inside the installed app. `onStart` runs first (the phone menu closes itself).
 */
export function InstallAppButton({
  placement,
  onStart,
  className,
}: {
  placement: "menu" | "footer";
  onStart?: () => void;
  className?: string;
}) {
  const mode = useInstallMode();
  if (mode === "none") return null;
  return (
    <Button
      variant={placement === "footer" ? "inverse" : "link"}
      size="sm"
      shape={placement === "footer" ? "pill" : "default"}
      className={cn(
        "gap-2",
        placement === "menu" && "justify-start text-small font-medium tracking-wide hover:no-underline",
        placement === "footer" && "self-start",
        className,
      )}
      onClick={() => {
        onStart?.();
        void startInstall();
      }}
    >
      <Smartphone className="size-4" strokeWidth={1.5} aria-hidden />
      {LABEL}
    </Button>
  );
}

/** The install guide, one for the whole page (the footer renders it, so it outlives the phone menu). */
export function InstallAppGuide() {
  const guide = useInstallGuide();
  return (
    <Dialog open={guide !== null} onOpenChange={(open) => !open && closeInstallGuide()}>
      {guide && (
        <DialogContent
          title={LABEL}
          description="Add Virzeen to your home screen. It opens full screen, like an app."
        >
          <ol className="flex flex-col gap-4">
            {STEPS[guide].map((step, index) => (
              <li key={step.id} className="flex items-start gap-3 text-body text-ink">
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-small font-medium"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5">{step.text}</span>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <DialogClose asChild>
              <Button shape="pill">Got it</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
