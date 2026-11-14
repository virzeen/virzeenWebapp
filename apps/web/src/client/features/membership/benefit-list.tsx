import { Badge } from "@virzeen/ui";
import { BENEFIT_GROUPS, BENEFITS, type MembershipLevel } from "@virzeen/validators/membership";
import { Check } from "lucide-react";
import { BenefitText } from "./benefit-text";

const FIELD = { GUEST: "guest", FREE: "free", PASS: "pass" } as const;

/**
 * Everything a level gets, grouped as in the guide: each line shows what the level receives, with a tick when it works
 * today and "Soon" when that part isn't built yet (specs/membership-portal.md). Benefits a level doesn't get are left out.
 */
export function BenefitList({ level }: { level: MembershipLevel }) {
  const groups = BENEFIT_GROUPS.map((group) => ({
    group,
    items: BENEFITS.filter((benefit) => benefit.group === group && benefit[FIELD[level]] !== null),
  })).filter((entry) => entry.items.length > 0);
  return (
    <div className="grid gap-10 md:grid-cols-2">
      {groups.map(({ group, items }) => (
        <section key={group} aria-labelledby={`benefits-${level}-${group}`} className="flex flex-col gap-4">
          <h3 id={`benefits-${level}-${group}`} className="font-display text-h3">
            {group}
          </h3>
          <ul className="flex flex-col divide-y divide-line">
            {items.map((benefit) => {
              const live = benefit.live.includes(level);
              return (
                <li key={benefit.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-body">{benefit.label}</span>
                    <span className="text-small text-ink-muted">
                      <BenefitText text={benefit[FIELD[level]] ?? ""} />
                    </span>
                  </div>
                  {live ? (
                    <Check className="mt-1 size-5 shrink-0" strokeWidth={1.5} aria-label="Available now" />
                  ) : (
                    <Badge className="mt-1 shrink-0">Soon</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
