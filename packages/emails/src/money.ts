// Money and date formatting for emails only. The web app renders money with <Price paisa>.

const wholeRupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fractionalRupees = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 125000 paisa → "Rs 1,250"; 125050 → "Rs 1,250.50" (docs/ui/content-style.md "Formatting"). */
export function formatPaisa(paisa: number): string {
  const format = paisa % 100 === 0 ? wholeRupees : fractionalRupees;
  return `Rs ${format.format(paisa / 100)}`;
}

// Fixed month names: ICU versions disagree on "Sep" vs "Sept".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const nepalParts = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "Asia/Kathmandu",
});

/** → "28 Sep 2026" in Nepal time. */
export function formatDate(date: Date): string {
  const parts = Object.fromEntries(nepalParts.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.day} ${MONTHS[Number(parts.month) - 1]} ${parts.year}`;
}
