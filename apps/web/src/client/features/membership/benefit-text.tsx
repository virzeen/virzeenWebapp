import { Price } from "@/client/components/shared/price";

/** Benefit copy with amounts written `{p:15000}` (paisa): the amounts are drawn with <Price>, the rest is text. */
export function BenefitText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  // The key is where the piece starts in the text: stable, and unique within it.
  for (const match of text.matchAll(/\{p:(\d+)\}/g)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(<Price key={match.index} paisa={Number(match[1])} />);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
