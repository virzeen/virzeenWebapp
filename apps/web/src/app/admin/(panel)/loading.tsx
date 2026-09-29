import { Skeleton } from "@virzeen/ui";

const ROWS = ["a", "b", "c", "d", "e", "f"];

/**
 * Shown inside the admin frame while a page loads, so the nav stays usable (ui-discipline.md §6).
 * Matches the common admin page: title row, then a table.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-3 pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton shape="text" className="w-32" />
      </div>
      <div className="overflow-hidden rounded-md border border-line">
        <div className="h-11 bg-surface" />
        <div className="divide-y divide-line">
          {ROWS.map((id) => (
            <div key={id} className="flex items-center justify-between gap-6 px-4 py-4">
              <Skeleton shape="text" className="w-40" />
              <Skeleton shape="text" className="w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
