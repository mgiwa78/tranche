import { Request, Response, NextFunction } from "express";
import { RedisClient } from "@/common/redis/client";
import { TooManyRequestsError } from "@/common/errors";
import { Logger } from "@/common/logger";
import { Config } from "@/config";
import type { JwtService } from "@/common/auth/jwt";

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  handler?: (req: Request, res: Response, next: NextFunction) => void;
}

export class RateLimiter {
  private redis: RedisClient;
  private logger: Logger;
  private options: Required<RateLimiterOptions>;

  constructor(redis: RedisClient, options: RateLimiterOptions) {
    this.redis = redis;
    this.logger = new Logger({ level: Config.logging.level, service: "rate-limiter" });
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      message: options.message || "Too many requests, please try again later.",
      keyGenerator: options.keyGenerator || ((req) => this.getClientIdentifier(req)),
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      handler:
        options.handler ||
        (() => {
          throw new TooManyRequestsError(this.options.message);
        }),
    };
  }

  private getClientIdentifier(req: Request): string {
    const userId = (req as any).user?.id;
    if (userId) {
      return `user:${userId}`;
    }
    return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
  }

  middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate_limit:${this.options.keyGenerator(req)}`;
      const now = Date.now();
      const windowStart = now - this.options.windowMs;

      const results = await this.redis.redis
        .multi()
        .zremrangebyscore(key, 0, windowStart)
        .zadd(key, now, `${now}:${Math.random().toString(36).slice(2)}`)
        .zcard(key)
        .zrange(key, 0, 0, "WITHSCORES")
        .expire(key, Math.ceil(this.options.windowMs / 1000))
        .exec();

      const currentCount = Number(results?.[2]?.[1] ?? 0);
      const oldest = Number((results?.[3]?.[1] as string[] | undefined)?.[1] ?? now);

      if (currentCount > this.options.maxRequests) {
        const resetTime = oldest + this.options.windowMs;
        const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));

        res.setHeader("X-RateLimit-Limit", this.options.maxRequests.toString());
        res.setHeader("X-RateLimit-Remaining", "0");
        res.setHeader("X-RateLimit-Reset", resetTime.toString());
        res.setHeader("Retry-After", retryAfter.toString());

        this.logger.warn("Rate limit exceeded", { key, currentCount, limit: this.options.maxRequests });

        return this.options.handler(req, res, next);
      }

      res.setHeader("X-RateLimit-Limit", this.options.maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, this.options.maxRequests - currentCount).toString());
      res.setHeader("X-RateLimit-Reset", (now + this.options.windowMs).toString());

      next();
    } catch (error) {
      if (error instanceof TooManyRequestsError) return next(error);
      this.logger.error("Rate limiter unavailable - allowing request", error as Error);
      next();
    }
  };
}

export const createRateLimiter = (
  redis: RedisClient,
  options: RateLimiterOptions,
): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  const limiter = new RateLimiter(redis, options);
  return limiter.middleware;
};

// Every preset is scaled by RATE_LIMIT_MULTIPLIER (1 in prod, looser in staging).
const scaled = (max: number) => Math.max(1, Math.round(max * Config.rateLimit.multiplier));

// Auth limits are per email, so retyping it in another case is the same bucket.
const authEmailKey = (req: Request) => {
  const email = req.body?.email;
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : `ip:${req.ip || "unknown"}`;
};

export const RateLimitPresets = {
  // Runs before auth: a valid bearer token buckets by user, so users sharing an IP
  // (carrier NAT, an office) don't exhaust each other's quota; anything else is per IP.
  general: (redis: RedisClient, jwtService: JwtService) =>
    createRateLimiter(redis, {
      windowMs: Config.rateLimit.windowMs,
      maxRequests: scaled(Config.rateLimit.maxRequests),
      message: "Too many requests, please try again later.",
      keyGenerator: (req) => {
        const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
        if (token) {
          try {
            return `general:user:${jwtService.verify(token).userId}`;
          } catch {
            // fall through to the IP bucket
          }
        }
        return `general:ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
      },
    }),

  authLogin: (redis: RedisClient) =>
    createRateLimiter(redis, {
      windowMs: 15 * 60 * 1000,
      maxRequests: scaled(10),
      message: "Too many sign-in attempts, please wait a few minutes and try again.",
      keyGenerator: (req) => `auth-login:${authEmailKey(req)}`,
    }),

  authRegister: (redis: RedisClient) =>
    createRateLimiter(redis, {
      windowMs: 60 * 60 * 1000,
      maxRequests: scaled(10),
      message: "Too many sign-ups from this network, please try again later.",
      keyGenerator: (req) => `auth-register:ip:${req.ip || "unknown"}`,
    }),

  payments: (redis: RedisClient, jwtService: JwtService) =>
    createRateLimiter(redis, {
      windowMs: 60 * 1000,
      maxRequests: scaled(20),
      message: "Too many payment attempts, please wait a moment.",
      keyGenerator: (req) => {
        const token = req.headers.authorization?.slice(7);
        try {
          return `payments:user:${token ? jwtService.verify(token).userId : req.ip}`;
        } catch {
          return `payments:ip:${req.ip || "unknown"}`;
        }
      },
    }),

  strict: (redis: RedisClient) =>
    createRateLimiter(redis, {
      windowMs: 15 * 60 * 1000,
      maxRequests: scaled(5),
      message: "Rate limit exceeded. Please slow down.",
    }),
};
