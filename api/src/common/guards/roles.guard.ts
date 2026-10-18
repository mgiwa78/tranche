import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AdminRole, hasAdminRole, MerchantStatus, UserRole } from "@tranche/shared";
import { ADMIN_ROLE_KEY, IS_PUBLIC_KEY, ROLES_KEY } from "../decorators";
import { ForbiddenError } from "../errors";

/**
 * Runs after JwtAuthGuard. `@Roles(UserRole.MERCHANT)` gates by role; `@MinAdminRole(AdminRole.ADMIN)`
 * adds the staff hierarchy on admin routes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, targets);
    const minAdmin = this.reflector.getAllAndOverride<AdminRole | undefined>(ADMIN_ROLE_KEY, targets);
    if (!roles?.length && !minAdmin) return true;

    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user) throw new ForbiddenError();

    if (roles?.length && !roles.includes(user.role)) {
      throw new ForbiddenError("You don't have access to this resource");
    }

    if (minAdmin) {
      if (user.role !== UserRole.ADMIN || !hasAdminRole(user.adminRole, minAdmin)) {
        throw new ForbiddenError("Your staff role can't perform this action");
      }
    }

    return true;
  }
}

/** Shared by merchant routes: a suspended merchant keeps read access but can't change anything. */
export const assertMerchantActive = (status: MerchantStatus) => {
  if (status === MerchantStatus.SUSPENDED) {
    throw new ForbiddenError("This merchant account is suspended. Contact Tranche support.");
  }
};
