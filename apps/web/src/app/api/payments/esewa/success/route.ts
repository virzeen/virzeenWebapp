import { paymentService } from "@virzeen/core";
import { esewaCallbackSchema } from "@virzeen/validators";
import type { NextRequest } from "next/server";
import { handleProviderReturn } from "@/server/api/payment-redirect";

export const dynamic = "force-dynamic";

/** eSewa success redirect: signature check + status API verification happen in core. */
export async function GET(request: NextRequest) {
  return handleProviderReturn("esewa", async () => {
    const { data } = esewaCallbackSchema.parse({ data: request.nextUrl.searchParams.get("data") ?? "" });
    return paymentService.handleEsewaSuccess(data);
  });
}
