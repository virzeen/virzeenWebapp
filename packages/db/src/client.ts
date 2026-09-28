// The single Prisma client instance (docs/ai/common-mistakes.md → Prisma).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

function createClient(connectionString: string | undefined) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to apps/web/.env.local (see README).");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForDb = globalThis as unknown as { virzeenDb?: PrismaClient };

/** Lazily created so importing @virzeen/db never needs a database (e.g. during `next build`). */
function getDb(): PrismaClient {
  globalForDb.virzeenDb ??= createClient(process.env.DATABASE_URL);
  return globalForDb.virzeenDb;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getDb();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Creates a separate client (tests use this with DATABASE_URL_TEST). */
export function createDbClient(connectionString: string): PrismaClient {
  return createClient(connectionString);
}
