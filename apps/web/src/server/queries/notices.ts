import "server-only";
import "@/server/bootstrap";
import { defaultNotices, noticeService, type NoticeView } from "@virzeen/core";
import type { NoticeAudience } from "@virzeen/validators";
import { logger } from "@/server/logger";

/** The notices for the bar above the header. A failed read must never break a page: it falls back to the built-in ones. */
export async function listNotices(audience: NoticeAudience): Promise<NoticeView[]> {
  try {
    return await noticeService.listFor(audience);
  } catch (error) {
    logger.error("notices: could not read the notice bar", {
      error: error instanceof Error ? error.message : String(error),
    });
    return defaultNotices(audience);
  }
}

export const listAdminNotices = () => noticeService.listForAdmin();
