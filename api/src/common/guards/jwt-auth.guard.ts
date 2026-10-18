import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DataSource } from "typeorm";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators";
import { JwtService } from "../auth/jwt";
import { assertSessionUsable } from "../auth/session";
import { UnauthorizedError } from "../errors";
import { UserPayload } from "../types";
import { requestContextStorage } from "../context/request-context";
import { User } from "@/database/entities/user.entity";

/**
 * Global guard. Verifies the RS256 bearer token, loads the user on every request so suspensions
 * and session revocation apply immediately, and sets `req.user`. Routes opt out with `@Public()`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedError("Missing bearer token");

    const decoded = this.jwtService.verify<UserPayload>(header.slice(7));
    if (decoded.jti) throw new UnauthorizedError("Refresh tokens can't be used to call the api");

    const user = await this.dataSource.getRepository(User).findOne({ where: { id: decoded.userId } });
    if (!user) throw new UnauthorizedError("Invalid token");

    assertSessionUsable(user, decoded.iat);

    req.user = user;
    const store = requestContextStorage.getStore();
    if (store) store.userId = user.id;
    return true;
  }
}
