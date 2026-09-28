import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { E2E_ENV, MAILPIT_URL } from "./env";

/** Fresh, seeded e2e database and an empty inbox before every run (testing-strategy.md §4). */
export default async function globalSetup() {
  const dbDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
  const env: NodeJS.ProcessEnv = { ...process.env, ...E2E_ENV, NODE_ENV: "development" };
  execSync("pnpm exec prisma migrate deploy", { cwd: dbDir, env, stdio: ["ignore", "pipe", "inherit"] });
  execSync("pnpm exec tsx scripts/clear-local-data.ts", {
    cwd: dbDir,
    env,
    stdio: ["ignore", "pipe", "inherit"],
  });
  execSync("pnpm exec tsx prisma/seed.ts", { cwd: dbDir, env, stdio: ["ignore", "pipe", "inherit"] });
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}
