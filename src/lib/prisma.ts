import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires an explicit driver adapter — there is no default
// connection-string-only mode any more. This app only ever imports
// `prisma` from here, so a future provider swap (e.g. to a different
// Postgres host) only touches this file plus prisma/seed.ts.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }
  const adapter = new PrismaPg(process.env.DATABASE_URL);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
