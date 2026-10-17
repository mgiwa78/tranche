// Unit tests never touch Postgres or Redis; keep config quiet and deterministic.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error";
process.env.SCHEDULE_TIMEZONE = "Africa/Lagos";
process.env.ENCRYPTION_KEY = "a".repeat(64);
