import { paymentService } from "@virzeen/core";
import { khaltiCallbackSchema } from "@virzeen/validators";
import type { NextRequest } from "next/server";
import { handleProviderReturn } from "@/server/api/payment-redirect";

export const dynamic = "force-dynamic";

/** Khalti return URL: only pidx is used, then verified with the lookup API (the status param is ignored). */
export async function GET(request: NextRequest) {
  return handleProviderReturn("khalti", async () => {
    const { pidx } = khaltiCallbackSchema.parse({ pidx: request.nextUrl.searchParams.get("pidx") ?? "" });
    return paymentService.handleKhaltiReturn(pidx);
  });
}
