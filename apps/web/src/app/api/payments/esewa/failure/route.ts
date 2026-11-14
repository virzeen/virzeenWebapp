import { paymentService } from "@virzeen/core";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleProviderReturn } from "@/server/api/payment-redirect";
import { getUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const refSchema = z.string().regex(/^VZ-\d{6}-\d{4}-\d{1,2}$/);

/**
 * eSewa failure redirect: re-checks the attempt and nothing ends early. The reference is guessable, so only the
 * order's own customer is told anything about it; everyone else gets the same neutral page (see core).
 */
export async function GET(request: NextRequest) {
  return handleProviderReturn("esewa", async () => {
    const ref = refSchema.parse(request.nextUrl.searchParams.get("ref") ?? "");
    const user = await getUser();
    return paymentService.handleEsewaFailure(ref, user?.id ?? null);
  });
}
