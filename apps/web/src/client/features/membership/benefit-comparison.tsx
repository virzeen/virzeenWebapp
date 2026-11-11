import { Badge } from "@virzeen/ui";
import { BENEFIT_GROUPS, BENEFITS, LEVEL_NAMES, type MembershipLevel } from "@virzeen/validators/membership";
import { BenefitText } from "./benefit-text";

const LEVELS: readonly MembershipLevel[] = ["GUEST", "FREE", "PASS"];
const FIELD = { GUEST: "guest", FREE: "free", PASS: "pass" } as const;

/** The three levels side by side, group by group (the public Membership page). The viewer's own column is marked. */
export function BenefitComparison({ current }: { current: MembershipLevel }) {
  return (
    <div className="flex flex-col gap-12">
      {BENEFIT_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-4">
          <h3 className="font-display text-h3">{group}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl border-collapse text-left text-body">
              <caption className="sr-only">{group}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="w-2/5 py-3 pr-4 font-normal text-ink-muted">
                    Benefit
                  </th>
                  {LEVELS.map((level) => (
                    <th key={level} scope="col" className="py-3 pr-4 font-medium">
                      {LEVEL_NAMES[level]}
                      {level === current && <Badge className="ml-2">You</Badge>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BENEFITS.filter((benefit) => benefit.group === group).map((benefit) => (
                  <tr key={benefit.id} className="border-b border-line align-top">
                    <th scope="row" className="py-3 pr-4 font-normal">
                      {benefit.label}
                    </th>
                    {LEVELS.map((level) => {
                      const value = benefit[FIELD[level]];
                      return (
                        <td key={level} className="py-3 pr-4 text-ink-muted">
                          {value === null ? (
                            <span aria-label="Not included">{"—"}</span>
                          ) : (
                            <BenefitText text={value} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
