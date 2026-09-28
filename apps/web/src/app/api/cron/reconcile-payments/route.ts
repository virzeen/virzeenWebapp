import "@/server/bootstrap";
import { timingSafeEqual } from "node:crypto";
import { reconcilePayments } from "@virzeen/core";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Railway cron, every 10 minutes (payment-policy.md §8). Idempotent; safe to run twice at once. */
async function run(request: Request) {
  if (!authorized(request)) return Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const summary = await reconcilePayments();
  return Response.json({ data: summary });
}

export const GET = run;
export const POST = run;
