import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { getQueueToken } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Config } from "@/config";
import { Logger } from "@/common/logger";
import { requestIdMiddleware } from "@/common/errors";
import { auditMiddleware } from "@/common/monitoring/audit";
import { ALL_QUEUES } from "@/queue/queue.constants";

export const API_PREFIX = "api/v1";

const allowOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return cb(null, false);
  const allowed = Config.allowedOrigins.some((pattern) => {
    if (pattern === "*") return true;
    if (pattern.startsWith("*.")) return origin.endsWith(pattern.slice(1));
    return origin === pattern;
  });
  cb(null, allowed);
};

const basicAuth = (username: string, password: string) => (req: Request, res: Response, next: NextFunction) => {
  const [scheme, encoded] = (req.headers.authorization ?? "").split(" ");
  const [user, pass] = Buffer.from(encoded ?? "", "base64")
    .toString()
    .split(":");
  if (scheme === "Basic" && user === username && pass === password) return next();
  res.setHeader("WWW-Authenticate", 'Basic realm="queues"');
  res.status(401).send("Authentication required");
};

/**
 * Middleware, pipes and filters applied before routes are mounted. Shared by main.ts and the
 * integration test harness so tests run the real pipeline.
 */
export const configureApp = (app: INestApplication, opts: { logRequests?: boolean } = {}) => {
  const express = app as NestExpressApplication;
  const logger = new Logger({ level: Config.logging.level, service: Config.service.name });

  express.set("trust proxy", 1);
  express.setGlobalPrefix(API_PREFIX);
  express.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", "tranche:", "exp:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  express.use(compression());
  express.useBodyParser("json", { limit: "1mb" });
  express.enableCors({
    origin: allowOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "Origin"],
  });
  express.use(requestIdMiddleware);
  express.use(auditMiddleware);

  if (opts.logRequests !== false) {
    morgan.token("url-path", (req) => new URL((req as Request).originalUrl ?? "", "http://x").pathname);
    express.use(
      morgan(
        Config.nodeEnv === "production" ? ":method :url-path :status :res[content-length] - :response-time ms" : "dev",
        {
          stream: { write: (m) => logger.info(m.trim()) },
          skip: (_req, res) => Config.nodeEnv === "production" && res.statusCode < 400,
        },
      ),
    );
  }

  const { username, password } = Config.queue.dashboard;
  if (username && password) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(`/${API_PREFIX}/admin/queues`);
    createBullBoard({
      queues: ALL_QUEUES.map((name) => new BullMQAdapter(app.get<Queue>(getQueueToken(name)))),
      serverAdapter,
    });
    express.use(`/${API_PREFIX}/admin/queues`, basicAuth(username, password), serverAdapter.getRouter());
  }

  app.enableShutdownHooks();
  return app;
};
