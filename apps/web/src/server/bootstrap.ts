import "server-only";
import { configureCore, isCoreConfigured } from "@virzeen/core";
import { env, features, siteUrl } from "@/server/env";
import { logger } from "@/server/logger";
import { createMailer } from "@/server/services/mailer";

/** Passes configuration to @virzeen/core once per server process (core never reads env itself). */
export function bootstrapCore() {
  if (isCoreConfigured()) return;
  configureCore({
    siteUrl,
    mailer: createMailer(),
    logger,
    ownerAlertEmail: env.OWNER_ALERT_EMAIL,
    esewa: {
      productCode: env.ESEWA_PRODUCT_CODE ?? "",
      secretKey: env.ESEWA_SECRET_KEY ?? "",
      formUrl: env.ESEWA_BASE_URL,
      statusUrl: env.ESEWA_STATUS_URL,
    },
    khalti: { secretKey: env.KHALTI_SECRET_KEY, baseUrl: env.KHALTI_BASE_URL },
    fetch: globalThis.fetch.bind(globalThis),
  });

  if (env.NODE_ENV === "production") {
    for (const [feature, enabled] of Object.entries(features)) {
      if (!enabled) logger.warn("feature disabled: missing configuration", { feature });
    }
  }
}

bootstrapCore();
