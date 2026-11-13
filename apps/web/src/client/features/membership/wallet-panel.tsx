import { Badge } from "@virzeen/ui";
import { POINT_VALUE_PAISA, POINTS_EXPIRY_DAYS } from "@virzeen/validators/limits";
import { Price } from "@/client/components/shared/price";
import { formatDate } from "@/client/lib/format";
import { PointsCoin } from "./points-coin";
import { SandGlass, SpinningCoin } from "./points-icons";

type WalletLine = {
  id: string;
  kind: "POINTS" | "CREDIT";
  type: "EARN" | "SPEND" | "EXPIRE" | "REFUND" | "ADJUST";
  amount: number;
  reason: string;
  createdAt: Date;
};

type WalletPanelProps = {
  points: number;
  creditPaisa: number;
  expiringSoon: { points: number; at: Date; daysLeft: number } | null;
  /** The Monochrome Pass: its points never expire, so there is no time bar. */
  isPass?: boolean;
  /** Whole days since the member joined. */
  memberDays: number;
  history: WalletLine[];
};

const TYPE_LABEL: Record<WalletLine["type"], string> = {
  EARN: "Earned",
  SPEND: "Spent",
  EXPIRE: "Expired",
  REFUND: "Given back",
  ADJUST: "Added",
};

/** A thin bar that fades in from the left and ends in a round cap, on a faint track (a share, 0 to 100). */
function GlowBar({ percent }: { percent: number }) {
  // The round caps are drawn past the line's ends, so the wrapper's side padding (half the bar's height) leaves room.
  return (
    <div className="px-2">
      <svg
        aria-hidden
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        overflow="visible"
        className="h-4 w-full text-canvas"
      >
        <defs>
          <linearGradient id="points-bar" gradientUnits="userSpaceOnUse" x1="0" x2="100" y1="0" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.1" />
            <stop offset="1" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          x2="100"
          y1="5"
          y2="5"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="16"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {percent > 0 && (
          <line
            x1="0"
            x2={Math.max(2, percent)}
            y1="5"
            y2="5"
            stroke="url(#points-bar)"
            strokeWidth="16"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

/** A small ring gauge (a share, 0 to 100) with its value beside it. */
function RingStat({
  percent,
  label,
  icon,
  children,
  testId,
  className,
}: {
  percent: number;
  label: string;
  /** A small animated icon in the middle of the ring. */
  icon: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className ?? ""}`} data-testid={testId}>
      <span className="relative grid size-10 shrink-0 place-items-center text-canvas sm:size-12">
        <svg aria-hidden viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="4"
          />
          {percent > 0 && (
            <circle
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray={`${Math.min(100, percent)} 100`}
            />
          )}
        </svg>
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-small whitespace-nowrap text-canvas/70">{label}</span>
        <span className="font-display text-h3">{children}</span>
      </div>
    </div>
  );
}

/**
 * A member's points and credit (specs/wallet.md), on a dark glass card: the points, what they are worth, the time left (12 months) on
 * the soonest MONO Member points (none for the Pass), and ring gauges for what expires soon, the value and any credit. Points are earned when an order
 * is delivered and spent at checkout (1 point is Rs 1, up to 20% of the products). The silver coin sits beside the card.
 */
export function WalletPanel({
  points,
  creditPaisa,
  expiringSoon,
  isPass = false,
  memberDays,
  history,
}: WalletPanelProps) {
  // MONO Member points last 12 months: the bar is the share of those 12 months still left on the soonest points.
  // The Pass's points never expire, so it has no bar.
  const barPercent = expiringSoon
    ? Math.min(100, Math.round((expiringSoon.daysLeft / POINTS_EXPIRY_DAYS) * 100))
    : 0;
  const showBar = !isPass;
  // The expiry ring fills a day at a time over the 12 months: since the soonest points were earned, or, with no points
  // yet, since the member joined. The Pass never expires, so its ring is full.
  const elapsedDays = expiringSoon ? POINTS_EXPIRY_DAYS - expiringSoon.daysLeft : memberDays;
  // A day is 0.3% of the ring, so from the first day it shows at least a visible arc, then grows a day at a time.
  const expiringPercent = isPass
    ? 100
    : elapsedDays > 0
      ? Math.min(100, Math.max(4, (elapsedDays / POINTS_EXPIRY_DAYS) * 100))
      : 0;
  return (
    <section aria-labelledby="wallet-heading" className="flex flex-col gap-8" data-testid="wallet-panel">
      <h2 id="wallet-heading" className="sr-only">
        Redeem points
      </h2>
      <div className="relative isolate overflow-hidden rounded-2xl border border-canvas/20 bg-linear-to-br from-ink-muted via-ink to-ink p-8 text-canvas lg:p-10">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 bg-linear-to-b from-canvas/15 to-transparent"
        />
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-12">
          <div className="flex flex-col gap-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-1">
                <p className="font-display text-h2">Your points</p>
                <p className="text-small text-canvas/70">Redeem them at checkout</p>
              </div>
              <p className="flex items-baseline gap-1 whitespace-nowrap">
                <span
                  className="font-display text-display leading-none motion-safe:animate-reveal"
                  data-testid="wallet-points"
                >
                  {points}
                </span>
                <span className="text-body-lg text-canvas/70">pts</span>
              </p>
            </div>
            {showBar && (
              <div className="flex flex-col gap-2">
                <GlowBar percent={barPercent} />
                {expiringSoon && (
                  <p className="text-small text-canvas/70" data-testid="wallet-days-left">
                    {`${expiringSoon.daysLeft} ${expiringSoon.daysLeft === 1 ? "day" : "days"} left to use your soonest points`}
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              <RingStat
                percent={expiringPercent}
                label="Expires on:"
                icon={<SandGlass />}
                testId={expiringSoon ? "wallet-expiring" : undefined}
              >
                {expiringSoon ? (
                  <>
                    {expiringSoon.points}{" "}
                    <span className="text-small text-canvas/70">pts · {formatDate(expiringSoon.at)}</span>
                  </>
                ) : (
                  <span className="text-body">{isPass ? "Never" : "12 months"}</span>
                )}
              </RingStat>
              <RingStat
                percent={points > 0 ? 100 : 0}
                label="Worth"
                icon={<SpinningCoin />}
                className="justify-self-end sm:justify-self-start"
              >
                <Price paisa={points * POINT_VALUE_PAISA} />
              </RingStat>
              {creditPaisa > 0 && (
                <RingStat percent={100} label="Credit" icon={<SpinningCoin />}>
                  <span data-testid="wallet-credit">
                    <Price paisa={creditPaisa} />
                  </span>
                </RingStat>
              )}
            </div>
          </div>
          <div className="hidden justify-self-center md:block">
            <PointsCoin />
          </div>
        </div>
      </div>
      {history.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line" aria-label="Recent points and credit">
          {history.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-4 py-3">
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 text-body">
                  {TYPE_LABEL[line.type]} <Badge>{line.kind === "POINTS" ? "Points" : "Credit"}</Badge>
                </span>
                <span className="text-small text-ink-muted">
                  {line.reason} · {formatDate(line.createdAt)}
                </span>
              </div>
              <span className="text-body whitespace-nowrap">
                {line.amount > 0 ? "+" : "−"}
                {line.kind === "POINTS" ? Math.abs(line.amount) : <Price paisa={Math.abs(line.amount)} />}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
