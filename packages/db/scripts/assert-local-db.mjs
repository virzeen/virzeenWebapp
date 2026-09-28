// Guard for db:reset:local — refuses to wipe anything that isn't a local database (CLAUDE.md §5.8).
import { config } from "dotenv";

config({ path: ["../../apps/web/.env.local", "../../apps/web/.env"], quiet: true });
const url = process.env.DATABASE_URL ?? "";
let host = "";
try {
  host = new URL(url).hostname;
} catch {
  console.error("DATABASE_URL is missing or invalid.");
  process.exit(1);
}
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(`Refusing to reset a non-local database (host: ${host}).`);
  process.exit(1);
}
