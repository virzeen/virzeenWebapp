"use server";

import "server-only";
import { noticeService } from "@virzeen/core";
import { deleteNoticeSchema, moveNoticeSchema, siteNoticeSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAdminAction } from "./guard";

/** The bar is in the shop layout, so a change refreshes every shop page. */
function refresh() {
  revalidatePath("/admin/notices");
  revalidatePath("/", "layout");
}

/** Adds a notice to the top bar or edits one (specs/top-notice-bar.md). Audited in core. */
export async function saveNoticeAction(input: unknown) {
  return runAdminAction("saveNotice", async (admin) => {
    const saved = await noticeService.save(admin.id, siteNoticeSchema.parse(input));
    refresh();
    return saved;
  });
}

/** Moves a notice one place up or down. */
export async function moveNoticeAction(input: unknown) {
  return runAdminAction("moveNotice", async (admin) => {
    const { id, direction } = moveNoticeSchema.parse(input);
    await noticeService.move(admin.id, id, direction);
    refresh();
    return { id };
  });
}

/** Deletes a notice. */
export async function deleteNoticeAction(input: unknown) {
  return runAdminAction("deleteNotice", async (admin) => {
    const { id } = deleteNoticeSchema.parse(input);
    await noticeService.remove(admin.id, id);
    refresh();
    return { id };
  });
}
