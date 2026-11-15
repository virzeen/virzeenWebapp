"use client";

import { cn, Container, Link } from "@virzeen/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AccountMenu } from "@/client/components/layout/account-menu";
import "./top-notice-bar.css";

export type TopNotice = { id: string; text: string; linkLabel: string | null; linkHref: string | null };

/** Seconds each notice stays before the next slides in. */
const SECONDS_SHOWN = 5;

/**
 * The black bar above the header, like Nike's (specs/top-notice-bar.md): one line of white text, with the link's
 * words underlined after it. Several notices slide sideways every 5 seconds; the rotation pauses while the pointer
 * or keyboard focus is on the bar and never runs with reduced motion. Arrows (on every width) and swipe move it by hand.
 * It is part of the page, not sticky: it scrolls away and the header stays, as on Nike's. From md the right corner
 * holds the profile like Nike's: "Hi, {name}" with the hover menu when signed in, "Sign in" when not.
 */
export function TopNoticeBar({
  notices,
  isSignedIn,
  firstName,
}: {
  notices: TopNotice[];
  isSignedIn: boolean;
  /** For "Hi, {name}"; null without a name. */
  firstName: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const touchStart = useRef<number | null>(null);
  const count = notices.length;
  const current = Math.min(index, Math.max(count - 1, 0));

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % count), SECONDS_SHOWN * 1000);
    return () => window.clearInterval(timer);
  }, [count, paused, reduceMotion, current]);

  const step = (by: number) => setIndex((current + by + count) % count);
  const rotating = count > 1 && !paused && !reduceMotion;

  return (
    <section
      aria-label="Notices"
      data-top-notice-bar
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const from = touchStart.current;
        touchStart.current = null;
        const to = event.changedTouches[0]?.clientX;
        if (count < 2 || from === null || to === undefined || Math.abs(to - from) < 40) return;
        step(to < from ? 1 : -1);
      }}
      className="relative z-30 bg-canvas pt-safe tone-inverse"
    >
      <Container className="grid h-9 grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[1fr_minmax(0,36rem)_1fr]">
        <span aria-hidden className="hidden lg:block" />
        <div className="relative flex min-w-0 items-stretch justify-center px-8 sm:px-12">
          {count > 1 && (
            <button
              type="button"
              aria-label="Previous notice"
              onClick={() => step(-1)}
              className="absolute inset-y-0 left-0 flex w-8 items-center justify-center text-ink sm:w-12"
            >
              <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          )}
          <div
            className="relative h-full min-w-0 flex-1 overflow-hidden"
            aria-live={rotating ? "off" : "polite"}
            aria-atomic
          >
            {notices.map((notice, position) => (
              <p
                key={notice.id}
                aria-hidden={position === current ? undefined : true}
                className={cn(
                  "absolute inset-0 flex items-center justify-center gap-1 text-center text-caption font-medium tracking-tight text-ink transition-transform duration-300 ease-standard motion-reduce:transition-none",
                  position === current && "translate-x-0",
                  position < current && "-translate-x-full",
                  position > current && "translate-x-full",
                )}
              >
                <span className="truncate">{notice.text}</span>
                {notice.linkLabel && notice.linkHref && (
                  <Link
                    href={notice.linkHref}
                    tabIndex={position === current ? undefined : -1}
                    className="shrink-0 text-ink underline-offset-2"
                  >
                    {notice.linkLabel}
                  </Link>
                )}
              </p>
            ))}
          </div>
          {count > 1 && (
            <button
              type="button"
              aria-label="Next notice"
              onClick={() => step(1)}
              className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-ink sm:w-12"
            >
              <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          )}
        </div>
        <div className="hidden items-center justify-end gap-2 pl-4 whitespace-nowrap md:flex">
          {isSignedIn ? (
            <AccountMenu firstName={firstName} />
          ) : (
            <nav aria-label="Join or sign in" className="flex items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-9 items-center text-caption font-medium tracking-tight text-ink no-underline hover:text-ink-muted"
              >
                Join Now
              </Link>
              <span aria-hidden className="h-3 w-px bg-line" />
              <Link
                href="/login"
                className="inline-flex h-9 items-center text-caption font-medium tracking-tight text-ink no-underline hover:text-ink-muted"
              >
                Sign In
              </Link>
            </nav>
          )}
        </div>
      </Container>
    </section>
  );
}
