import "server-only";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Keeps the first value of each query param (`?size=M&size=L` → `M`). */
export function flattenSearchParams(
  params: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => {
      const first = Array.isArray(value) ? value[0] : value;
      return first === undefined || first === "" ? [] : [[key, first]];
    }),
  );
}
