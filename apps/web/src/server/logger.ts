import "server-only";

// Structured JSON logger (backend-policies.md §7). Sensitive keys are redacted before anything is written:
// never log secrets, tokens, OTPs, wallet ids, addresses, phone numbers or emails.

type Level = "info" | "warn" | "error";
type Meta = Record<string, unknown>;

const SENSITIVE =
  /secret|token|password|otp|totp|cookie|authorization|phone|mobile|address|street|email|signature|raw/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Meta).map(([key, inner]) => [
      key,
      SENSITIVE.test(key) && key !== "orderNumber" && key !== "providerRef"
        ? "[redacted]"
        : redact(inner, depth + 1),
    ]),
  );
}

function write(level: Level, message: string, meta?: Meta) {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...(redact(meta ?? {}) as Meta),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else process.stdout.write(`${line}\n`);
}

export const logger = {
  info: (message: string, meta?: Meta) => write("info", message, meta),
  warn: (message: string, meta?: Meta) => write("warn", message, meta),
  error: (message: string, meta?: Meta) => write("error", message, meta),
};
