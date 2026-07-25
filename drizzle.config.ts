import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Neon (of een andere Postgres) via DATABASE_URL. `drizzle-kit push` heeft een
    // bereikbare database nodig; in productie is dat je Neon-connectionstring.
    url: process.env.DATABASE_URL || "postgres://localhost:5432/dreamteam",
  },
});
