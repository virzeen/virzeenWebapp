import { Badge, ButtonLink } from "@virzeen/ui";
import { POINT_VALUE_PAISA } from "@virzeen/validators/limits";
import { Price } from "@/client/components/shared/price";
import { formatDate } from "@/client/lib/format";

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
  expiringSoon: { points: number; at: Date } | null;
  history: WalletLine[];
};

const TYPE_LABEL: Record<WalletLine["type"], string> = {
  EARN: "Earned",
  SPEND: "Spent",
  EXPIRE: "Expired",
  REFUND: "Given back",
  ADJUST: "Added",
};

/**
 * A member's points and credit (specs/wallet.md): the two balances, what expires first, and the newest lines. Points are
 * earned when an order is delivered and spent at checkout (1 point is Rs 1, up to 20% of the products).
 */
export function WalletPanel({ points, creditPaisa, expiringSoon, history }: WalletPanelProps) {
  return (
    <section aria-labelledby="wallet-heading" className="flex flex-col gap-8" data-testid="wallet-panel">
      <h2 id="wallet-heading" className="font-display text-h2">
        Redeem points
      </h2>
      <div className="relative isolate overflow-hidden rounded-xl border border-line bg-surface p-8 lg:p-12">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-linear-to-r from-transparent via-canvas/70 to-transparent motion-safe:animate-shine-sweep"
        />
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-caption tracking-widest text-ink-muted uppercase">Your points</p>
            <p
              className="font-display text-display leading-none motion-safe:animate-reveal"
              data-testid="wallet-points"
            >
              {points}
            </p>
            <p className="text-body text-ink-muted">
              Worth <Price paisa={points * POINT_VALUE_PAISA} /> off your next order
            </p>
            {expiringSoon && (
              <p
                className="w-fit rounded-full border border-line bg-canvas px-4 py-1 text-small"
                data-testid="wallet-expiring"
              >
                {expiringSoon.points} {expiringSoon.points === 1 ? "point expires" : "points expire"} on{" "}
                {formatDate(expiringSoon.at)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            {creditPaisa > 0 && (
              <p className="flex items-baseline gap-2 text-body">
                <span className="text-ink-muted">Credit</span>
                <span className="font-display text-h2" data-testid="wallet-credit">
                  <Price paisa={creditPaisa} />
                </span>
              </p>
            )}
            <ButtonLink href="/shop" shape="pill" size="lg">
              Shop and redeem
            </ButtonLink>
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
      ) : (
        <p className="text-body text-ink-muted">
          Nothing yet. Your first points arrive when an order is delivered.
        </p>
      )}
    </section>
  );
}
