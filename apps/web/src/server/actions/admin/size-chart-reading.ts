"use server";
import "server-only";
import { AppError, interpretChartReading, PICTURE_READING_MESSAGES } from "@virzeen/core";
import { env, features } from "@/server/env";
import { logger } from "@/server/logger";
import { rateLimit } from "@/server/security/rate-limit";
import { readSizeChartPicture } from "@/server/services/gemini";
import { checkChartPicture } from "@/server/services/size-chart-picture";
import { runAdminAction } from "./guard";

/**
 * "Fill from a picture" on a Clothing size guide (specs/size-chart-from-picture.md): reads the picture and returns the
 * table it would make. Nothing is saved, stored or audited: the admin checks the table and saves the guide as usual.
 * Sign-in, admin and the `admin` limit come from `runAdminAction`; the two reading limits protect the free Google quota.
 */
export async function readSizeChartPictureAction(formData: FormData) {
  return runAdminAction("readSizeChartPicture", async (admin) => {
    await rateLimit("admin:ai", `admin:${admin.id}`);
    await rateLimit("admin:ai-day", `admin:${admin.id}`);
    const picture = await checkChartPicture(formData.get("picture"));
    if (!features.pictureReading) {
      logger.warn("size chart picture not read", { why: "no key" });
      throw new AppError("INTERNAL", PICTURE_READING_MESSAGES.couldntRead);
    }
    const started = Date.now();
    const reading = await readSizeChartPicture({
      picture,
      apiKey: env.GEMINI_API_KEY as string,
      model: env.GEMINI_MODEL,
      baseUrl: env.GEMINI_API_URL,
    });
    const result = interpretChartReading(reading);
    // No picture, key or cells in the log: who, and how long.
    logger.info("size chart read from picture", { adminId: admin.id, ms: Date.now() - started });
    return result;
  });
}
