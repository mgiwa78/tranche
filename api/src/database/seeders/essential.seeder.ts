import { INestApplicationContext } from "@nestjs/common";
import { DataSource } from "typeorm";
import bcrypt from "bcryptjs";
import { AccountStatus, AdminRole, UserRole } from "@tranche/shared";
import { User } from "@/database/entities";
import { Config } from "@/config";
import { LedgerService } from "@/core/ledger/ledger.service";
import { DEFAULT_PLATFORM_SETTINGS, SettingsService } from "@/core/settings.service";

export interface SeedContext {
  dataSource: DataSource;
  app: INestApplicationContext;
  log: (message: string) => void;
}

export interface Seeder {
  run(ctx: SeedContext): Promise<void>;
}

export const DEMO_PASSWORD = "Tranche123!";

export const upsertUser = async (
  dataSource: DataSource,
  data: Pick<User, "email" | "firstName" | "lastName" | "role"> & Partial<User>,
  password: string,
): Promise<User> => {
  const repo = dataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email: data.email } });
  if (existing) return existing;
  return repo.save(
    repo.create({
      status: AccountStatus.ACTIVE,
      creditLimitKobo: 0,
      ...data,
      passwordHash: await bcrypt.hash(password, 10),
    }),
  );
};

/** Platform settings, the platform ledger accounts and the staff accounts. Safe to run in production. */
export class EssentialSeeder implements Seeder {
  async run({ dataSource, app, log }: SeedContext) {
    const settings = app.get(SettingsService);
    await settings.update({ ...DEFAULT_PLATFORM_SETTINGS, ...(await settings.get()) });
    log("platform settings ready");

    await app.get(LedgerService).ensurePlatformAccounts();
    log("platform ledger accounts ready");

    await upsertUser(
      dataSource,
      {
        email: Config.seed.adminEmail,
        firstName: "Tranche",
        lastName: "Admin",
        role: UserRole.ADMIN,
        adminRole: AdminRole.SUPER_ADMIN,
      },
      Config.seed.adminPassword,
    );
    if (Config.nodeEnv !== "production") {
      await upsertUser(
        dataSource,
        {
          email: "support@tranche.ng",
          firstName: "Sade",
          lastName: "Support",
          role: UserRole.ADMIN,
          adminRole: AdminRole.SUPPORT,
        },
        DEMO_PASSWORD,
      );
    }
    log(`super admin ready (${Config.seed.adminEmail})`);
  }
}
