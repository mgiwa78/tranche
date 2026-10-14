export type Uuid = string;
export type IsoDate = string;

/* ----------------------------- envelopes ----------------------------- */

export interface ApiEnvelope<T> {
  success: boolean;
  response: T;
  message?: string;
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "TOKEN_EXPIRED"
  | "INVALID_TOKEN"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DUPLICATE_RESOURCE"
  | "INVALID_REFERENCE"
  | "REQUIRED_FIELD_MISSING"
  | "GONE"
  | "TOO_MANY_REQUESTS"
  | "PAYMENT_FAILED"
  | "INSUFFICIENT_CREDIT"
  | "INSUFFICIENT_BALANCE"
  | "LEDGER_UNBALANCED"
  | "MAINTENANCE_MODE"
  | "SERVICE_UNAVAILABLE"
  | "DATABASE_ERROR"
  | "INTERNAL_SERVER_ERROR";

export interface FieldError {
  path: string;
  message: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: { message: string; code: ErrorCode; details?: FieldError[] };
  timestamp: IsoDate;
  requestId?: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}
