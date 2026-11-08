import "server-only";
import type { Prisma } from "@virzeen/db";

// Shop search (specs/search.md): every word must match the name, category, a collection, a style name, a colour
// shown or a style number. ILIKE '%word%' through Prisma's `contains`; the catalogue is small enough that no
// search index is needed yet (database/data-rules.md §1).

/** At most this many words count; the rest of the query is ignored. */
export const SEARCH_MAX_WORDS = 5;

/**
 * The query's words, lower-cased, without `%`, `_` and `\` (so they match nothing special), at most
 * `SEARCH_MAX_WORDS`. Each word comes with the forms it matches: a word over 3 letters ending in "s" also matches
 * without it ("tops" → "top"), so plurals find singular names.
 */
export function searchWords(query: string): string[][] {
  return query
    .toLowerCase()
    .replace(/[%_\\]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, SEARCH_MAX_WORDS)
    .map((word) => (word.length > 3 && word.endsWith("s") ? [word, word.slice(0, -1)] : [word]));
}

const contains = (form: string) => ({ contains: form, mode: "insensitive" as const });

function wordMatches(form: string): Prisma.ProductWhereInput[] {
  return [
    { name: contains(form) },
    { category: { name: contains(form) } },
    { collections: { some: { archivedAt: null, name: contains(form) } } },
    { variants: { some: { isActive: true, color: contains(form) } } },
    { styles: { some: { OR: [{ colourShown: contains(form) }, { code: contains(form) }] } } },
  ];
}

/** The `where` for a search query, or null when it has no words (then everything is listed). */
export function searchWhere(query: string): Prisma.ProductWhereInput | null {
  const words = searchWords(query);
  if (words.length === 0) return null;
  return { AND: words.map((forms) => ({ OR: forms.flatMap(wordMatches) })) };
}
