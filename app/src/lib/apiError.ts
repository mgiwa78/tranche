import { fieldErrorsFromApi } from '@tranche/shared';

import type { ApiErrorEnvelope } from '../types/api';

type MaybeError = { status?: number | string; data?: unknown; error?: string } | undefined | null;

export function errorStatus(error: unknown): number | null {
  const status = (error as MaybeError)?.status;
  return typeof status === 'number' ? status : null;
}

export function errorCode(error: unknown): string | null {
  const data = (error as MaybeError)?.data as Partial<ApiErrorEnvelope> | undefined;
  return data?.error?.code ?? null;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  const e = error as MaybeError;
  if (!e) return fallback;
  if (e.status === 'FETCH_ERROR' || e.status === 'TIMEOUT_ERROR') {
    return "Can't reach Tranche. Check your connection and try again.";
  }
  const data = e.data as Partial<ApiErrorEnvelope> | undefined;
  const message = data?.error?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Per-field messages from a 400 VALIDATION_ERROR, keyed like the shared schema. */
export function fieldErrors(error: unknown): Record<string, string> {
  const data = (error as MaybeError)?.data as Partial<ApiErrorEnvelope> | undefined;
  return data?.error?.code === 'VALIDATION_ERROR' ? fieldErrorsFromApi(data.error.details) : {};
}
