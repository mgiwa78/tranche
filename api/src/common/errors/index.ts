import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import type { ErrorCode } from "@tranche/shared";

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  path: string;
  method: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

export class AppError extends Error {
  public readonly isOperational = true;

  constructor(
    message: string,
    public status: number = 500,
    public code: ErrorCode = "INTERNAL_SERVER_ERROR",
    public details?: unknown,
    public context?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
      context: this.context,
      stack: this.stack,
    };
  }
}

export const buildErrorContext = (req: Request): ErrorContext => {
  const user = (req as any).user;

  return {
    requestId: req.requestId || req.get("X-Request-ID"),
    userId: user?.id,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.socket?.remoteAddress,
  };
};

const SENSITIVE_FIELDS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "token",
  "secret",
  "key",
  "authorization",
  "authorizationcode",
  "authorization_code",
  "refreshtoken",
  "accesstoken",
  "pin",
  "cvv",
]);

export const sanitizeBody = (body: any, depth = 0): any => {
  if (depth > 5 || !body || typeof body !== "object") return body;
  if (Array.isArray(body)) return body.map((v) => sanitizeBody(v, depth + 1));

  const sanitized: Record<string, any> = {};
  for (const [field, value] of Object.entries(body)) {
    sanitized[field] = SENSITIVE_FIELDS.has(field.toLowerCase()) ? "[REDACTED]" : sanitizeBody(value, depth + 1);
  }
  return sanitized;
};

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.get("X-Request-ID");
  const requestId =
    incoming && incoming.length <= 64 ? incoming : `req_${Date.now()}_${randomBytes(5).toString("hex")}`;
  req.requestId = requestId;
  res.set("X-Request-ID", requestId);
  next();
};

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown, context?: Record<string, any>) {
    super(message, 400, "VALIDATION_ERROR", details, context);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string, details?: unknown, context?: Record<string, any>) {
    super(message, 500, "INTERNAL_SERVER_ERROR", details, context);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", context?: Record<string, any>) {
    super(message, 401, "UNAUTHORIZED", undefined, context);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message: string = "Email or password is incorrect") {
    super(message, 401, "INVALID_CREDENTIALS");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied", context?: Record<string, any>) {
    super(message, 403, "FORBIDDEN", undefined, context);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", context?: Record<string, any>) {
    super(message, 404, "NOT_FOUND", undefined, context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown, context?: Record<string, any>) {
    super(message, 409, "CONFLICT", details, context);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests", context?: Record<string, any>) {
    super(message, 429, "TOO_MANY_REQUESTS", undefined, context);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, "BAD_REQUEST", undefined, context);
  }
}

export class PaymentFailedError extends AppError {
  constructor(message: string = "Payment could not be completed", details?: unknown) {
    super(message, 402, "PAYMENT_FAILED", details);
  }
}

export class InsufficientCreditError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, "INSUFFICIENT_CREDIT", details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message: string = "Amount exceeds your available balance", details?: unknown) {
    super(message, 422, "INSUFFICIENT_BALANCE", details);
  }
}

export class LedgerUnbalancedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 500, "LEDGER_UNBALANCED", details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service temporarily unavailable", context?: Record<string, any>) {
    super(message, 503, "SERVICE_UNAVAILABLE", undefined, context);
  }
}

export class MaintenanceModeError extends AppError {
  constructor(message: string = "Tranche is down for scheduled maintenance. Please try again shortly.") {
    super(message, 503, "MAINTENANCE_MODE");
  }
}

export class GoneError extends AppError {
  constructor(message: string = "Resource has expired") {
    super(message, 410, "GONE");
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = "Token has expired") {
    super(message, 401, "TOKEN_EXPIRED");
  }
}

export class InvalidTokenError extends AppError {
  constructor(message: string = "Invalid token provided") {
    super(message, 401, "INVALID_TOKEN");
  }
}

export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};
