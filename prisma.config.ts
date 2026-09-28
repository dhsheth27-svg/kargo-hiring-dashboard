import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js convention is .env.local (not .env) — load it explicitly so the
// Prisma CLI (generate/migrate/studio) sees the same DATABASE_URL the app does.
config({ path: ".env.local" });

// Prisma 7 moved the datasource connection URL out of schema.prisma and into
// this config file — and dropped the old `directUrl` field. This file is
// only used by the CLI (generate/migrate/studio), never by the running app
// (src/lib/prisma.ts builds its own adapter), so it's safe to point it at
// DIRECT_URL: Supabase's connection pooler (DATABASE_URL, transaction mode)
// doesn't support the prepared statements schema migrations need, but a
// direct connection does. The app itself uses the pooled DATABASE_URL at
// runtime, which is what you want on Vercel's serverless functions.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
