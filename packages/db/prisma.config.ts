// Prisma CLI config (Prisma 7). Local env lives in apps/web/.env.local so the app and the CLI share one file.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ["../../apps/web/.env.local", "../../apps/web/.env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read directly (not env()) so `prisma generate` works in CI without a database.
    url: process.env.DATABASE_URL ?? "",
  },
});
