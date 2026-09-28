import "@/server/bootstrap";
import { db } from "@virzeen/db";

export const dynamic = "force-dynamic";

/** Railway health check: the app is up and can reach the database. */
export async function GET() {
  try {
    await db.orderNumberCounter.findFirst({ select: { day: true } });
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
