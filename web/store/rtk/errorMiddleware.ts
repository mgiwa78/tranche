import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import { toast } from "sonner";
import type { ApiErrorEnvelope } from "@/types/global";

function extractError(payload: unknown): Partial<ApiErrorEnvelope["error"]> {
  if (!payload || typeof payload !== "object") return {};
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return {};
  return (data as Partial<ApiErrorEnvelope>).error ?? {};
}

/**
 * Turns every RTK Query rejection into a toast. Session 401s are skipped: the base query's
 * refresh-and-redirect flow handles those. A wrong password is a 401 too, and is shown.
 */
export const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const status = (action.payload as { status?: number } | undefined)?.status;
    const error = extractError(action.payload);
    if (status !== 401 || error.code === "INVALID_CREDENTIALS") {
      toast.error(error.message ?? "Something went wrong. Please try again.");
    }
  }
  return next(action);
};
