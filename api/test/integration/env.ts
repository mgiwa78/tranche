import { generateKeyPairSync } from "crypto";
import dotenv from "dotenv";

// Load .env before defaults so local DB/Redis credentials apply.
dotenv.config({ quiet: true });

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const set = (k: string, v: string) => {
  if (!process.env[k]) process.env[k] = v;
};

process.env.NODE_ENV = "test";
set("DB_HOST", "127.0.0.1");
set("DB_USERNAME", "postgres");
set("DB_PASSWORD", "postgres");
set("REDIS_HOST", "127.0.0.1");
// Never point the suite at the dev database: it drops the schema.
process.env.DB_NAME = process.env.TEST_DB_NAME ?? "tranche_test";
process.env.DATABASE_URL = "";
process.env.REDIS_URL = "";
// Force test isolation / timing regardless of .env.
process.env.REDIS_KEY_PREFIX = `tranche-int-${process.pid}`;
process.env.JWT_PRIVATE_KEY = privateKey;
process.env.JWT_PUBLIC_KEY = publicKey;
process.env.ENCRYPTION_KEY = "b".repeat(64);
process.env.LOG_LEVEL = "error";
process.env.RATE_LIMIT_MULTIPLIER = "100";
process.env.QUEUE_INLINE = "true";
process.env.APP_ROLE = "api";
process.env.QUEUE_DASHBOARD_USER = "";

process.env.PAYSTACK_SECRET_KEY = "";
process.env.RESEND_API_KEY = "";
process.env.EXPO_ACCESS_TOKEN = "";
