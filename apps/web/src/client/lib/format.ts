// Date formatting with a fixed locale and time zone, so server and browser render the same text
// (no hydration mismatch). Copy rules: docs/ui/content-style.md "Formatting".

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const nepalParts = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kathmandu",
});

function parts(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return Object.fromEntries(nepalParts.formatToParts(value).map((p) => [p.type, p.value]));
}

/** "28 Sep 2026" */
export function formatDate(date: Date | string): string {
  const p = parts(date);
  return `${p.day} ${MONTHS[Number(p.month) - 1]} ${p.year}`;
}

/** "28 Sep 2026, 3:45 PM" (Asia/Kathmandu) */
export function formatDateTime(date: Date | string): string {
  const p = parts(date);
  return `${formatDate(date)}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
}
