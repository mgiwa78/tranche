import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import { toast } from "sonner";
import type { ApiErrorEnvelope } from "@/types/global";

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const envelope = data as Partial<ApiErrorEnvelope>;
  return envelope.error?.message ?? null;
}

/**
 * Turns every RTK Query
 * rejection into a toast, so individual components don't have to. 401s are
 * swallowed here — the base query's refresh-and-redirect flow already
 * handles those, and a stray toast right before a redirect is just noise.
 */
export const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const status = (action.payload as { status?: number } | undefined)?.status;
    if (status !== 401) {
      const message = extractMessage(action.payload) ?? "Something went wrong. Please try again.";
      toast.error(message);
    }
  }
  return next(action);
};
