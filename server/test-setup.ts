// Draait vóór de testmodules laden. Gebruik een in-memory PGlite-database (embedded
// Postgres) en een klein, voorspelbaar tokenbudget zodat tests geen bestand
// aanmaken, geen externe database raken en het budget deterministisch is.
import { beforeAll } from "vitest";
import { initStorage } from "./storage";

delete process.env.DATABASE_URL; // nooit een echte Neon-DB raken tijdens tests
process.env.DB_PATH = ":memory:"; // PGlite in-memory
process.env.DAILY_TOKEN_LIMIT = "1000";
delete process.env.HTTPS_PROXY; // geen proxy-setup tijdens tests

// Verbind + maak de tabellen aan vóór de eerste test. Idempotent en per
// testbestand-worker één keer (vitest isoleert modules per bestand), dus elke
// suite start met een schone, embedded Postgres.
beforeAll(async () => {
  await initStorage();
});
