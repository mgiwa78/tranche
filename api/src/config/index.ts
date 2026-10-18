import { z } from "zod";
import dotenv from "dotenv";
import { Logger } from "../common/logger";

dotenv.config({ quiet: true });

const configSchema = z.object({
  port: z.string().default("4000").transform(Number),
  nodeEnv: z.enum(["development", "production", "staging", "test"]).default("development"),
  appUrl: z.string().default("http://localhost:4000"),
  /** `api` serves HTTP only, `worker` runs BullMQ processors only, `all` does both (single Render service). */
  appRole: z.enum(["api", "worker", "all"]).default("all"),
  database: z.object({
    /** Render/Railway style connection string. Wins over the discrete fields when set. */
    url: z.string().default(""),
    host: z.string().default("localhost"),
    port: z.string().default("5432").transform(Number),
    username: z.string().default("postgres"),
    password: z.string().default("postgres"),
    name: z.string().default("tranche"),
    ssl: z.boolean().default(false),
    synchronize: z.boolean().default(false),
  }),
  redis: z.object({
    url: z.string().default(""),
    host: z.string().default("localhost"),
    username: z.string().default(""),
    port: z.string().default("6379").transform(Number),
    password: z.string().default(""),
    db: z.string().default("0").transform(Number),
    keyPrefix: z.string().default("tranche"),
    ttl: z.string().default("3600").transform(Number),
  }),
  allowedOrigins: z.array(z.string()).default(["http://localhost:3000"]),
  jwt: z.object({
    accessTtl: z.string().default("15m"),
    refreshTtl: z.string().default("30d"),
    publicKey: z.string().optional(),
    privateKey: z.string().optional(),
  }),
  rateLimit: z.object({
    windowMs: z.string().default("900000").transform(Number),
    maxRequests: z.string().default("1500").transform(Number),
    // Scales every limiter preset; staging runs looser (see infra env examples).
    multiplier: z.string().default("1").transform(Number),
  }),
  encryption: z.object({
    algorithm: z.string().default("aes-256-gcm"),
    key: z.string().default(""),
  }),
  service: z.object({
    name: z.string().default("tranche-api"),
    version: z.string().default("1.0.0"),
  }),
  logging: z.object({
    level: z.enum(["debug", "info", "warn", "error"]).default("info"),
    toFile: z.boolean().default(false),
  }),
  email: z.object({
    from: z.string().default("Tranche <no-reply@tranche.ng>"),
  }),
  resend: z.object({
    apiKey: z.string().default(""),
  }),
  queue: z.object({
    settings: z.object({
      removeOnComplete: z.string().default("500").transform(Number),
      removeOnFail: z.string().default("1000").transform(Number),
      attempts: z.string().default("3").transform(Number),
    }),
    inline: z.boolean().default(false),
    dashboard: z.object({
      username: z.string().default(""),
      password: z.string().default(""),
    }),
  }),
  schedules: z.object({
    remindersCron: z.string().default("0 8 * * *"),
    chargesCron: z.string().default("0 * * * *"),
    overdueCron: z.string().default("30 0 * * *"),
    timezone: z.string().default("Africa/Lagos"),
  }),
  paystack: z.object({
    secretKey: z.string().default(""),
    publicKey: z.string().default(""),
    baseUrl: z.string().default("https://api.paystack.co"),
    /** Where Paystack sends the browser after checkout. Empty = this api's /payments/return. */
    callbackUrl: z.string().default(""),
    /** The app deep link /payments/return redirects to. */
    appReturnUrl: z.string().default("tranche://checkout/callback"),
  }),
  expo: z.object({
    accessToken: z.string().default(""),
  }),
  seed: z.object({
    adminEmail: z.string().default("admin@tranche.ng"),
    adminPassword: z.string().default("Tranche123!"),
  }),
});

const Config = configSchema.parse({
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  appUrl: process.env.APP_URL,
  appRole: process.env.APP_ROLE as "api" | "worker" | "all" | undefined,
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true",
    synchronize: process.env.DB_SYNCHRONIZE === "true",
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USERNAME,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
    keyPrefix: process.env.REDIS_KEY_PREFIX,
    ttl: process.env.REDIS_TTL,
  },
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:3000"],
  jwt: {
    accessTtl: process.env.JWT_ACCESS_TTL,
    refreshTtl: process.env.JWT_REFRESH_TTL,
    publicKey: process.env.JWT_PUBLIC_KEY,
    privateKey: process.env.JWT_PRIVATE_KEY,
  },
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
    multiplier: process.env.RATE_LIMIT_MULTIPLIER,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
    algorithm: process.env.ENCRYPTION_ALGORITHM,
  },
  service: {
    name: process.env.SERVICE_NAME,
    version: process.env.SERVICE_VERSION,
  },
  logging: {
    level: process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error" | undefined,
    toFile: process.env.ENABLE_FILE_LOGGING === "true",
  },
  email: {
    from: process.env.SMTP_FROM,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  queue: {
    settings: {
      removeOnComplete: process.env.QUEUE_REMOVE_ON_COMPLETE,
      removeOnFail: process.env.QUEUE_REMOVE_ON_FAIL,
      attempts: process.env.QUEUE_ATTEMPTS,
    },
    inline: process.env.QUEUE_INLINE === "true",
    dashboard: {
      username: process.env.QUEUE_DASHBOARD_USER,
      password: process.env.QUEUE_DASHBOARD_PASSWORD,
    },
  },
  schedules: {
    remindersCron: process.env.REMINDERS_CRON,
    chargesCron: process.env.CHARGES_CRON,
    overdueCron: process.env.OVERDUE_CRON,
    timezone: process.env.SCHEDULE_TIMEZONE,
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    baseUrl: process.env.PAYSTACK_BASE_URL,
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
    appReturnUrl: process.env.APP_RETURN_URL,
  },
  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL,
    adminPassword: process.env.SEED_ADMIN_PASSWORD,
  },
});

if (Config.nodeEnv !== "test") {
  const bootLogger = new Logger({
    level: Config.logging.level,
    service: "config",
  });
  bootLogger.info(`Environment: ${Config.nodeEnv} (role: ${Config.appRole})`);
  bootLogger.info(
    Config.database.url
      ? "Database: DATABASE_URL"
      : `Database: ${Config.database.host}:${Config.database.port}/${Config.database.name}`,
  );
}

/** Paystack needs an https callback; the api bounces it into the app's deep link. */
export const paystackCallbackUrl = () => Config.paystack.callbackUrl || `${Config.appUrl}/api/v1/payments/return`;

export const runsHttp = () => Config.appRole !== "worker";
export const runsWorkers = () => Config.appRole !== "api";

export function getAppUrl(): string {
  return Config.appUrl;
}

export { Config };
