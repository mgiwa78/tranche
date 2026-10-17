import { AccountStatus } from "@tranche/shared";
import type { User } from "@/database/entities/user.entity";
import { UnauthorizedError } from "../errors";

/** Copied from the reference's jwt-user.loader: suspended users and revoked sessions are rejected. */
export function assertSessionUsable(user: User, issuedAtSeconds: number): void {
  if (user.status === AccountStatus.SUSPENDED) {
    throw new UnauthorizedError("Your account has been suspended. Please contact support.");
  }

  if (user.sessionsRevokedAt) {
    const revokedAtSeconds = Math.floor(new Date(user.sessionsRevokedAt).getTime() / 1000);
    if (issuedAtSeconds <= revokedAtSeconds) {
      throw new UnauthorizedError("Session has been revoked. Please log in again.");
    }
  }
}
