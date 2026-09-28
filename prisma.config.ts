import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js convention is .env.local (not .env) — load it explicitly so the
// Prisma CLI (generate/migrate/studio) sees the same DATABASE_URL the app does.
config({ path: ".env.local" });

// Prisma 7 moved the datasource connection URL out of schema.prisma and into
// this config file. To move from local SQLite to Supabase/Neon Postgres for
// production: change the `provider` in prisma/schema.prisma to "postgresql"
// and set DATABASE_URL below (via env) to the Postgres connection string —
// nothing else in this file needs to change.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
