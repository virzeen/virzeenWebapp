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

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "September 2026" (Asia/Kathmandu): the profile's "Member since". */
export function formatMonthYear(date: Date | string): string {
  const p = parts(date);
  return `${LONG_MONTHS[Number(p.month) - 1]} ${p.year}`;
}

/** "28 Sep 2026, 3:45 PM" (Asia/Kathmandu) */
export function formatDateTime(date: Date | string): string {
  const p = parts(date);
  return `${formatDate(date)}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** "3:45 PM" (Asia/Kathmandu): the time an unpaid order must be paid by. */
export function formatTime(date: Date | string): string {
  const p = parts(date);
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/**
 * How long until an order should leave us, or how late it is: "Due in 25 min", "Due in 2 h", "Late by 3 h" (specs/member-perks.md).
 * `now` is passed in so a page reads the clock once.
 */
export function dueLabel(promisedAt: Date | string, now: Date): { text: string; late: boolean } {
  const minutes = Math.round((new Date(promisedAt).getTime() - now.getTime()) / 60_000);
  const abs = Math.abs(minutes);
  const span =
    abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} days`;
  return minutes >= 0 ? { text: `Due in ${span}`, late: false } : { text: `Late by ${span}`, late: true };
}
