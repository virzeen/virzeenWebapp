import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Applies migrations to the disposable test database before the suite runs. */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST ?? "";
  if (!/\/virzeen_test(\?|$)/.test(url) || !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
    throw new Error("DATABASE_URL_TEST must point at a local database named virzeen_test.");
  }
  execSync("pnpm exec prisma migrate deploy", {
    cwd: fileURLToPath(new URL("../../db", import.meta.url)),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
