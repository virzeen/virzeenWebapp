import { Badge } from "@virzeen/ui";
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
      <div className="flex flex-col gap-2">
        <h2 id="wallet-heading" className="font-display text-h2">
          Points and credit
        </h2>
        <p className="text-body text-ink-muted">
          Earn points on every delivered order and spend them, with your credit, at checkout.
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        <div className="flex flex-col gap-2 bg-canvas p-6">
          <dt className="text-small text-ink-muted">Points</dt>
          <dd className="font-display text-h2" data-testid="wallet-points">
            {points}
          </dd>
          <dd className="text-small text-ink-muted">
            Worth <Price paisa={points * POINT_VALUE_PAISA} /> at checkout
          </dd>
          {expiringSoon && (
            <dd className="text-small text-ink-muted" data-testid="wallet-expiring">
              {expiringSoon.points} {expiringSoon.points === 1 ? "point expires" : "points expire"} on{" "}
              {formatDate(expiringSoon.at)}
            </dd>
          )}
        </div>
        <div className="flex flex-col gap-2 bg-canvas p-6">
          <dt className="text-small text-ink-muted">Credit</dt>
          <dd className="font-display text-h2" data-testid="wallet-credit">
            <Price paisa={creditPaisa} />
          </dd>
          <dd className="text-small text-ink-muted">Never expires</dd>
        </div>
      </dl>
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
