import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { ZodError } from "zod";
import { QueryFailedError } from "typeorm";
import { Logger } from "../logger";
import { Config } from "@/config";
import { AppError, buildErrorContext, sanitizeBody } from "./index";

const logger = new Logger({ level: Config.logging.level, service: "error-handler" });

const HTTP_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "BAD_REQUEST",
  409: "CONFLICT",
  413: "BAD_REQUEST",
  415: "BAD_REQUEST",
  429: "TOO_MANY_REQUESTS",
};

/**
 * The reference's Express `errorHandler`, as a Nest filter. Every error leaves the api as
 * `{ success: false, error: { message, code, details? }, timestamp, requestId }`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const context = buildErrorContext(req);
    const isDevelopment = Config.nodeEnv === "development";
    const request = { body: sanitizeBody(req.body), query: req.query, params: req.params };

    const send = (status: number, error: Record<string, unknown>) => {
      if (res.headersSent) return;
      res.status(status).json({ success: false, error, timestamp: context.timestamp, requestId: context.requestId });
    };

    if (err instanceof AppError) {
      const log = err.status >= 500 ? logger.error.bind(logger) : null;
      if (log) log("Operational error", err, { code: err.code, context, request });
      else
        logger.warn("Operational error", {
          error: { message: err.message, code: err.code, status: err.status },
          context,
        });

      send(err.status, {
        message: err.message,
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
        ...(isDevelopment && err.status >= 500 ? { stack: err.stack } : {}),
      });
      return;
    }

    if (err instanceof ZodError) {
      logger.warn("Validation error", { issues: err.issues, context });
      send(400, {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      });
      return;
    }

    if (err instanceof QueryFailedError) {
      const dbError = err as any;
      logger.error("Database error", err, {
        code: dbError.code,
        detail: dbError.detail,
        constraint: dbError.constraint,
        context,
        request,
      });

      let status = 500;
      let message = "Database operation failed";
      let code = "DATABASE_ERROR";

      if (dbError.code === "23505") {
        status = 409;
        message = "Resource already exists";
        code = "DUPLICATE_RESOURCE";
      } else if (dbError.code === "23503") {
        status = 400;
        message = "Invalid reference";
        code = "INVALID_REFERENCE";
      } else if (dbError.code === "23502") {
        status = 400;
        message = "Required field missing";
        code = "REQUIRED_FIELD_MISSING";
      } else if (dbError.code === "22P02") {
        status = 400;
        message = "Invalid identifier";
        code = "BAD_REQUEST";
      }

      send(status, {
        message,
        code,
        ...(isDevelopment && {
          details: { code: dbError.code, detail: dbError.detail, constraint: dbError.constraint },
        }),
      });
      return;
    }

    if (err instanceof HttpException) {
      const status = err.getStatus();
      const body = err.getResponse();
      const message = typeof body === "string" ? body : ((body as any)?.message ?? err.message ?? "Request failed");
      if (status >= 500) logger.error("HTTP exception", err, { context });
      send(status, {
        message: Array.isArray(message) ? message.join(", ") : String(message),
        code: HTTP_CODES[status] ?? (status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST"),
      });
      return;
    }

    const error = err instanceof Error ? err : new Error(String(err));

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      logger.warn("JWT error", { error: { name: error.name, message: error.message }, context });
      send(401, { message: "Invalid or expired token", code: "INVALID_TOKEN" });
      return;
    }

    logger.error("Unexpected error", error, { context, request });
    send(HttpStatus.INTERNAL_SERVER_ERROR, {
      message: isDevelopment ? error.message : "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
      ...(isDevelopment && { stack: error.stack }),
    });
  }
}
