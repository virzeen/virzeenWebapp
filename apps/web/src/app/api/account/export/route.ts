import { isAppError, settingsService } from "@virzeen/core";
import "@/server/bootstrap";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/account/export: the signed-in member's own data as one JSON file ("Download your data", Settings > Privacy,
 * specs/member-area-nike-layout.md). Never anyone else's, and no secrets (settingsService.exportData selects fields).
 */
export async function GET() {
  try {
    const user = await requireUser();
    await rateLimit("account", `export:${user.id}`);
    const data = await settingsService.exportData(user.id);
    const day = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="virzeen-my-data-${day}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      const status = error.code === "RATE_LIMITED" ? 429 : error.code === "UNAUTHENTICATED" ? 401 : 400;
      return Response.json({ error: { code: error.code, message: error.message } }, { status });
    }
    throw error;
  }
}
