import type { ApiEnvelope } from '../../types/api';

export function unwrap<T>(res: ApiEnvelope<T>): T {
  return res.response;
}
