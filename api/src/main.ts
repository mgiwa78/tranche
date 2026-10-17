import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { Config, runsHttp } from "./config";
import { Logger } from "./common/logger";

const logger = new Logger({ level: Config.logging.level, service: Config.service.name });

const assertProductionConfig = () => {
  if (Config.nodeEnv !== "production") return;
  const missing = [
    ["JWT_PRIVATE_KEY", Config.jwt.privateKey],
    ["JWT_PUBLIC_KEY", Config.jwt.publicKey],
    ["ENCRYPTION_KEY", Config.encryption.key],
    ["PAYSTACK_SECRET_KEY", Config.paystack.secretKey],
  ].filter(([, v]) => !v);
  if (missing.length) throw new Error(`Missing required production config: ${missing.map(([k]) => k).join(", ")}`);
};

async function bootstrap() {
  assertProductionConfig();

  if (!runsHttp()) {
    // APP_ROLE=worker: BullMQ processors only, no HTTP server.
    const ctx = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
    ctx.enableShutdownHooks();
    logger.info("Worker started (APP_ROLE=worker)");
    return;
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: Config.nodeEnv === "production" ? ["error", "warn"] : ["error", "warn", "log"],
  });
  configureApp(app);
  await app.listen(Config.port, "0.0.0.0");
  logger.info(`Tranche api running on port ${Config.port} (role: ${Config.appRole})`);
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", reason instanceof Error ? reason : new Error(String(reason)));
});

bootstrap().catch((error) => {
  logger.error("Failed to start", error as Error);
  process.exit(1);
});
