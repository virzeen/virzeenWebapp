import "server-only";

// Core never reads env, cookies or requests (docs/architecture.md "The layer rule").
// The web app passes everything core needs once at startup via configureCore().

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

export type Mailer = { send(message: OutgoingEmail): Promise<void> };

export type Logger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export type CoreConfig = {
  /** Public site URL, used for provider return URLs and links in emails. */
  siteUrl: string;
  mailer: Mailer;
  logger: Logger;
  /** Inbox that receives payment mismatch / stuck payment alerts. */
  ownerAlertEmail: string;
  esewa: { productCode: string; secretKey: string; formUrl: string; statusUrl: string };
  khalti: { secretKey: string | undefined; baseUrl: string };
  /** HTTP client for provider calls; tests inject a fake. */
  fetch: typeof fetch;
};

let current: CoreConfig | null = null;

export function configureCore(config: CoreConfig): void {
  current = config;
}

export function getCoreConfig(): CoreConfig {
  if (!current) throw new Error("configureCore() must be called before using @virzeen/core services.");
  return current;
}

export function isCoreConfigured(): boolean {
  return current !== null;
}
