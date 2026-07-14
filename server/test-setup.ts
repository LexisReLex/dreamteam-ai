// Draait vóór de testmodules laden. Gebruik een in-memory SQLite-database en een
// klein, voorspelbaar tokenbudget zodat tests geen bestand aanmaken en het budget
// deterministisch is.
process.env.DB_PATH = ":memory:";
process.env.DAILY_TOKEN_LIMIT = "1000";
delete process.env.HTTPS_PROXY; // geen proxy-setup tijdens tests
