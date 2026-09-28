import { paymentService } from "@virzeen/core";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleProviderReturn } from "@/server/api/payment-redirect";
import { getUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const refSchema = z.string().regex(/^VZ-\d{6}-\d{4}-\d{1,2}$/);

/** eSewa failure redirect. Only the order's own customer can end the attempt early (see core). */
export async function GET(request: NextRequest) {
  return handleProviderReturn("esewa", async () => {
    const ref = refSchema.parse(request.nextUrl.searchParams.get("ref") ?? "");
    const user = await getUser();
    return paymentService.handleEsewaFailure(ref, user?.id ?? null);
  });
}
