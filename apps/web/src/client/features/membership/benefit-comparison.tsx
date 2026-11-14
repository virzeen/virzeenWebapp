import { BENEFIT_GROUPS, BENEFITS, LEVEL_NAMES, type MembershipLevel } from "@virzeen/validators/membership";
import { BenefitText } from "./benefit-text";

const LEVELS: readonly MembershipLevel[] = ["GUEST", "FREE", "PASS"];
const FIELD = { GUEST: "guest", FREE: "free", PASS: "pass" } as const;

/** The three levels side by side, group by group (the public Membership page). The viewer's own column (header and every cell) is bold. */
export function BenefitComparison({ current }: { current: MembershipLevel }) {
  return (
    <div className="flex flex-col gap-12">
      {BENEFIT_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-4">
          <h3 className="font-display text-h3">{group}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl table-fixed border-collapse text-left text-body text-ink">
              {/* Fixed widths, the same in every group's table, so the columns line up all the way down. */}
              <colgroup>
                <col className="w-1/3" />
                <col className="w-2/9" />
                <col className="w-2/9" />
                <col className="w-2/9" />
              </colgroup>
              <caption className="sr-only">{group}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-3 pr-4 font-normal">
                    Benefit
                  </th>
                  {LEVELS.map((level) => (
                    // The viewer's own level is the bold one.
                    <th
                      key={level}
                      scope="col"
                      aria-current={level === current || undefined}
                      className={`py-3 pr-4 ${level === current ? "font-bold" : "font-medium"}`}
                    >
                      {LEVEL_NAMES[level]}
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
                        <td key={level} className={`py-3 pr-4 ${level === current ? "font-bold" : ""}`}>
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
