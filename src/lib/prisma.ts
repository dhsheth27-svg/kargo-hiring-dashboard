import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma 7 requires an explicit driver adapter — there is no default
// connection-string-only mode any more. Swapping to Supabase/Neon Postgres
// in production means swapping this adapter for @prisma/adapter-pg (and
// changing the `provider` in prisma/schema.prisma to "postgresql"); nothing
// else in the app needs to change since it only ever imports `prisma` from
// here.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
