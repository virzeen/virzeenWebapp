# Common Mistakes (read every session)

Known traps for this stack and project. When a new mistake happens twice, add it to the Lessons log at the bottom.

## Next.js (15/16, App Router)

- `params` and `searchParams` are Promises: `const { slug } = await params`.
- `cookies()` and `headers()` are async: `await cookies()`.
- Next.js 16 uses `proxy.ts` (not `middleware.ts`) for request interception.
- Server Actions are public HTTP endpoints. Always authenticate, authorize, and validate inside them — a hidden button is not security.
- `redirect()` and `notFound()` work by throwing. Never call them inside a `try` that swallows errors.
- After a mutation, call `revalidatePath`/`revalidateTag`, or the UI shows stale data.
- `fetch` is not cached by default in Next.js 15+; opt in deliberately.
- Hydration errors come from `Date.now()`, `Math.random()`, `toLocaleString()` without fixed locale, or reading `window` during render.

## Tailwind v4

- Configuration lives in CSS (`@import "tailwindcss"` + `@theme`), not `tailwind.config.js`.
- In the monorepo, the app's CSS must include `@source "../../../packages/ui/src";` or primitive classes won't be generated.
- Never build class names dynamically (`bg-${color}`); use full class strings in `cva` variant maps.
- Use token utilities (`text-h2`, `bg-surface`), not Tailwind defaults (`text-2xl`, `bg-gray-100`).

## React

- Don't mark big trees `"use client"`; only the interactive leaf.
- No data fetching in `useEffect`; fetch on the server.
- No array index as `key`.
- Props into client components must be serializable (no Prisma objects with Dates-as-classes/Decimals, no functions).

## Prisma

- Inside `db.$transaction(async (tx) => …)`, use `tx` for every query — using `db` escapes the transaction.
- Always `select` the fields you need; never return whole `User` rows to the client.
- Stock and status updates must be conditional (`where: { stock: { gte: qty } }`, `where: { status: "PENDING" }`) and check the affected count.
- One Prisma client instance (singleton in `packages/db/src/client.ts`).
- If generated types look stale after a schema change, run `pnpm --filter @virzeen/db exec prisma generate`.

## Zod / validation

- Check the installed Zod major version before writing schemas. Zod 4 prefers top-level formats like `z.email()`.
- Object schemas at boundaries use `.strict()`.
- Client and server import the same schema from `@virzeen/validators` — never duplicate a schema.

## Testing

- `import "server-only"` throws outside Next.js. Vitest config aliases `server-only` to an empty module.
- Playwright: use `getByRole`/`getByLabel`; never `waitForTimeout`; `await expect(...)` retries automatically.
- Never mock the thing under test; mock only external providers.

## Money and payments

- Khalti amounts are paisa; eSewa `total_amount` is rupees with 2 decimals. Convert only inside the adapter.
- A redirect to the success URL is not proof of payment.

## Working habits that cause AI mistakes

- Guessing a component prop instead of checking the Storybook MCP.
- Guessing a library API instead of checking the installed version (Context7 MCP or `node_modules/<pkg>` types).
- Editing a file without reading it first, or rewriting a whole file to change three lines.
- "While I'm here" refactors outside the task scope.
- Saying "done" without running the checks and showing the result.
- Hard-coding UI text that exists in `docs/ui/content-style.md`.

## Lessons log

Format: `YYYY-MM-DD — what went wrong — rule/doc updated`

- (empty)
