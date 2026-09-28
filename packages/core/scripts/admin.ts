// Owner command for admin accounts (docs/runbooks/admin-accounts.md). From the repo root:
//   pnpm admin list
//   pnpm admin grant <email>       make an admin (creates the account if needed)
//   pnpm admin reset-2fa <email>   lost phone: set up the authenticator again at /admin
//   pnpm admin revoke <email>      remove admin rights
// Changes to a database that isn't on this computer need --yes.
import { config } from "dotenv";

config({ path: ["../../apps/web/.env.local", "../../apps/web/.env"], quiet: true });

const USAGE = `Usage: pnpm admin <list | grant <email> | reset-2fa <email> | revoke <email>> [--yes]`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const confirmed = args.includes("--yes");
const [command, email] = args.filter((arg) => arg !== "--yes");

let host = "";
let name = "";
try {
  const url = new URL(process.env.DATABASE_URL ?? "");
  host = url.hostname;
  name = url.pathname.slice(1);
} catch {
  fail("DATABASE_URL is missing or invalid. Set it, or add it to apps/web/.env.local.");
}
const isLocal = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
// Host and database name only: the URL also holds the password.
console.log(`Database: ${name} on ${host}${isLocal ? " (this computer)" : ""}`);

if (command !== "list") {
  if (!["grant", "reset-2fa", "revoke"].includes(command ?? "") || !email) fail(USAGE);
  if (!isLocal && !confirmed) fail("This database is not on this computer. Run again with --yes to confirm.");
}

const { adminAccounts } = await import("../src/admin/admin-accounts");
const { isAppError } = await import("../src/errors");
const { db } = await import("@virzeen/db");

try {
  if (command === "list") {
    const admins = await adminAccounts.list();
    if (admins.length === 0) console.log("No admins yet. Add one with: pnpm admin grant <email>");
    for (const admin of admins) {
      const twoFactor = admin.twoFactorEnabled ? "authenticator set up" : "authenticator not set up yet";
      console.log(`- ${admin.email} (${twoFactor})`);
    }
  } else if (command === "grant") {
    const { created } = await adminAccounts.grant(email as string);
    console.log(
      `${email} is now an admin${created ? " (new account)" : ""}. They sign in at /login and set up an authenticator app on their first visit to /admin.`,
    );
  } else if (command === "reset-2fa") {
    await adminAccounts.resetTwoFactor(email as string);
    console.log(
      `Authenticator removed and ${email} signed out everywhere. They set up a new one on their next visit to /admin.`,
    );
  } else {
    await adminAccounts.revoke(email as string);
    console.log(`${email} is no longer an admin and has been signed out everywhere.`);
  }
} catch (error) {
  if (isAppError(error)) {
    process.exitCode = 1;
    console.error(error.message);
  } else {
    throw error;
  }
} finally {
  await db.$disconnect();
}
