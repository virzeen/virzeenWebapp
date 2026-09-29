// Checking one edit against the whole product (productSchema) before it goes into the form, and turning schema or
// server problems into field errors. Pure functions.

export type FieldChange = { name: string; value: unknown };
type Issue = { path: readonly PropertyKey[]; message: string };

const isContainer = (value: unknown): value is Record<string, unknown> | unknown[] =>
  typeof value === "object" && value !== null;

/** `values` with each change set at its dotted path ("variants.2.stock"); only the objects on the path are copied. */
export function withChanges<T>(values: T, changes: readonly FieldChange[]): T {
  let next: unknown = values;
  for (const { name, value } of changes) next = setAt(next, name.split("."), value);
  return next as T;
}

function setAt(target: unknown, keys: readonly string[], value: unknown): unknown {
  const [key, ...rest] = keys;
  if (key === undefined) return value;
  const copy: Record<string, unknown> | unknown[] = Array.isArray(target)
    ? [...target]
    : isContainer(target)
      ? { ...target }
      : /^\d+$/.test(key)
        ? []
        : {};
  const child = (copy as Record<string, unknown>)[key];
  (copy as Record<string, unknown>)[key] = setAt(child, rest, value);
  return copy;
}

/** A schema issue's dotted path; "" for a problem with the whole product. */
export const issuePath = (issue: Pick<Issue, "path">) => issue.path.map(String).join(".");

/** True when `path` is `name` or inside it ("variants.2.sku" is inside "variants" and "variants.2"). */
export const isUnder = (path: string, name: string) => path === name || path.startsWith(`${name}.`);

/** The first issue on one of `names` (or inside one), else null: the message to show under the edited field. */
export function firstIssueUnder(issues: readonly Issue[], names: readonly string[]): string | null {
  const issue = issues.find((candidate) => names.some((name) => isUnder(issuePath(candidate), name)));
  return issue?.message ?? null;
}

/** One message per path (the first), in the schema's order: what form.setError gets after a failed check. */
export function errorsByPath(issues: readonly Issue[]): [string, string][] {
  const errors = new Map<string, string>();
  for (const issue of issues) {
    const path = issuePath(issue);
    if (!errors.has(path)) errors.set(path, issue.message);
  }
  return [...errors];
}

/** saveProductAction's field keys ("product.variants.2.sku", or "slug" from core) as form paths. */
export const formPathOf = (key: string) => key.replace(/^product\./, "");
