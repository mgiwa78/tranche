import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import {
  AccountStatus,
  AuthResponse,
  AuthTokens,
  ChangePasswordDTO,
  LoginDTO,
  MerchantStatus,
  MeView,
  RegisterCustomerDTO,
  RegisterMerchantDTO,
  UpdateProfileDTO,
  UserRole,
} from "@tranche/shared";
import { Merchant, User } from "@/database/entities";
import { Config } from "@/config";
import { JwtService } from "@/common/auth/jwt";
import { assertSessionUsable } from "@/common/auth/session";
import { RedisClient } from "@/common/redis/client";
import { durationToSeconds } from "@/common/helpers/duration";
import { ConflictError, InvalidCredentialsError, UnauthorizedError } from "@/common/errors";
import { AuditLogger } from "@/common/monitoring/audit";
import { UserPayload } from "@/common/types";
import { UserRepository } from "@/repository/user.repository";
import { MerchantRepository } from "@/repository/merchant.repository";
import { SettingsService } from "@/core/settings.service";
import { EmailService } from "@/core/email.service";
import { toMeView } from "@/core/billing/presenters";

const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("tranche-timing-equaliser", BCRYPT_ROUNDS);

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "merchant";

/**
 * Email + password auth: RS256 access token and a rotating refresh token whose jti is allow-listed
 * in Redis (`refresh:<jti>`), revocable at logout.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly users: UserRepository,
    private readonly merchants: MerchantRepository,
    private readonly jwtService: JwtService,
    private readonly redis: RedisClient,
    private readonly settings: SettingsService,
    private readonly email: EmailService,
  ) {}

  hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

  registerCustomer = async (dto: RegisterCustomerDTO): Promise<AuthResponse> => {
    await this.assertEmailFree(dto.email);
    const { defaultCreditLimitKobo } = await this.settings.get();
    const user = await this.users.save(
      this.users.create({
        email: dto.email,
        passwordHash: await this.hashPassword(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        role: UserRole.CUSTOMER,
        status: AccountStatus.ACTIVE,
        creditLimitKobo: defaultCreditLimitKobo,
      }),
    );
    void this.email.sendWelcome(user.email, user.firstName);
    return this.session(user);
  };

  registerMerchant = async (dto: RegisterMerchantDTO): Promise<AuthResponse> => {
    await this.assertEmailFree(dto.email);
    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.dataSource.transaction(async (manager) => {
      const base = slugify(dto.businessName);
      let slug = base;
      for (let n = 2; await manager.exists(Merchant, { where: { slug }, withDeleted: true }); n++)
        slug = `${base}-${n}`;

      const merchant = await manager.save(
        manager.create(Merchant, {
          name: dto.businessName,
          slug,
          status: MerchantStatus.PENDING,
          supportEmail: dto.email,
        }),
      );
      const owner = await manager.save(
        manager.create(User, {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone ?? null,
          role: UserRole.MERCHANT,
          merchantId: merchant.id,
          status: AccountStatus.ACTIVE,
          creditLimitKobo: 0,
        }),
      );
      await manager.update(Merchant, merchant.id, { ownerUserId: owner.id });
      return owner;
    });
    return this.session(user);
  };

  login = async (dto: LoginDTO): Promise<AuthResponse> => {
    const user = await this.users.findByEmail(dto.email);
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new InvalidCredentialsError();
    if (user.status === AccountStatus.SUSPENDED) {
      throw new UnauthorizedError("Your account has been suspended. Please contact support.");
    }
    await this.users.update(user.id, { lastLoginAt: new Date() });
    AuditLogger.getInstance()
      .logAuth("login", user.id, { role: user.role })
      .catch(() => undefined);
    return this.session(user);
  };

  issueTokens = async (user: User): Promise<AuthTokens> => {
    const accessToken = this.jwtService.sign<UserPayload>({ userId: user.id, role: user.role }, Config.jwt.accessTtl);
    const jti = randomUUID();
    const refreshToken = this.jwtService.sign<UserPayload>({ userId: user.id, jti }, Config.jwt.refreshTtl);
    await this.redis.set(`refresh:${jti}`, user.id, durationToSeconds(Config.jwt.refreshTtl));
    return { accessToken, refreshToken };
  };

  /** Single use: the presented refresh token is deleted before a new pair is issued. */
  refresh = async (token: string): Promise<AuthResponse> => {
    const decoded = this.jwtService.verify<UserPayload>(token);
    if (!decoded.jti) throw new UnauthorizedError("Invalid refresh token");
    const owner = await this.redis.get(`refresh:${decoded.jti}`);
    if (!owner || owner !== decoded.userId) throw new UnauthorizedError("Refresh token has been used or revoked");
    await this.redis.del(`refresh:${decoded.jti}`);

    const user = await this.users.findOne({ where: { id: decoded.userId } });
    if (!user) throw new UnauthorizedError("Invalid refresh token");
    assertSessionUsable(user, decoded.iat);
    return this.session(user);
  };

  logout = async (token: string | undefined) => {
    if (!token) return { loggedOut: true };
    try {
      const decoded = this.jwtService.verify<UserPayload>(token);
      if (decoded.jti) await this.redis.del(`refresh:${decoded.jti}`);
    } catch {
      // An expired refresh token is already useless; logout still succeeds.
    }
    return { loggedOut: true };
  };

  me = async (user: User): Promise<MeView> => {
    const merchant = user.merchantId ? await this.merchants.findById(user.merchantId) : null;
    return toMeView(user, merchant);
  };

  updateProfile = async (user: User, dto: UpdateProfileDTO): Promise<MeView> => {
    await this.users.update(user.id, {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
    });
    return this.me((await this.users.findOne({ where: { id: user.id } }))!);
  };

  /** Changing the password signs out every other session. */
  changePassword = async (user: User, dto: ChangePasswordDTO): Promise<AuthResponse> => {
    const fresh = await this.users.findOneOrFail({ where: { id: user.id } });
    if (!(await bcrypt.compare(dto.currentPassword, fresh.passwordHash))) {
      throw new InvalidCredentialsError("Current password is incorrect");
    }
    // Second resolution so tokens issued in the same second as the revocation are rejected.
    const revokedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    await this.users.update(user.id, {
      passwordHash: await this.hashPassword(dto.newPassword),
      sessionsRevokedAt: revokedAt,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000 - (Date.now() % 1000) + 5));
    return this.session((await this.users.findOneOrFail({ where: { id: user.id } }))!);
  };

  private async session(user: User): Promise<AuthResponse> {
    return { ...(await this.issueTokens(user)), user: await this.me(user) };
  }

  private async assertEmailFree(email: string) {
    if (await this.users.exists({ where: { email }, withDeleted: true })) {
      throw new ConflictError("An account with this email already exists");
    }
  }
}
