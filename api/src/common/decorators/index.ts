import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Request } from "express";
import { AdminRole, UserRole } from "@tranche/shared";
import type { User } from "@/database/entities/user.entity";
import { UnauthorizedError } from "../errors";

export const IS_PUBLIC_KEY = "isPublic";
export const ROLES_KEY = "roles";
export const ADMIN_ROLE_KEY = "adminRole";
export const RESPONSE_MESSAGE_KEY = "responseMessage";
export const RAW_RESPONSE_KEY = "rawResponse";

/** Skips the global JwtAuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** For `role = admin` routes: the minimum staff rank (support < admin < super_admin). */
export const MinAdminRole = (role: AdminRole) => SetMetadata(ADMIN_ROLE_KEY, role);

export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);

/** Sends the handler's return value as-is (no envelope). */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  const req = ctx.switchToHttp().getRequest<Request>();
  if (!req.user) throw new UnauthorizedError();
  return req.user;
});

export const CurrentMerchantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  if (!req.user?.merchantId) throw new UnauthorizedError("No merchant account is linked to this user");
  return req.user.merchantId;
});
