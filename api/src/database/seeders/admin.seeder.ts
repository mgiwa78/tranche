import { DataSource } from "typeorm";
import bcrypt from "bcryptjs";
import { AccountStatus, AdminRole, UserRole } from "@tranche/shared";
import { User } from "@/database/entities";
import { Config } from "@/config";
import { UserRepository } from "@/repository/user.repository";

export const ADMIN_EMAILS: string[] = ["admin1@tranche.ng", "admin2@tranche.ng", "admin3@tranche.ng"];

export class AdminSeeder {
  constructor(
    private readonly emails: string[] = ADMIN_EMAILS,
    private readonly password: string = Config.seed.adminPassword,
  ) {}

  public async run(dataSource: DataSource): Promise<void> {
    const users = new UserRepository(dataSource);
    const repo = dataSource.getRepository(User);
    const emails = new Set(this.emails.map((e) => e.trim().toLowerCase()).filter(Boolean));

    for (const email of emails) {
      const existing = await users.findByEmail(email);
      if (existing?.role === UserRole.ADMIN && existing.adminRole === AdminRole.SUPER_ADMIN) continue;
      if (existing) {
        existing.role = UserRole.ADMIN;
        existing.adminRole = AdminRole.SUPER_ADMIN;
        existing.merchantId = null;
        await repo.save(existing);
        continue;
      }
      await repo.save(
        repo.create({
          email,
          passwordHash: await bcrypt.hash(this.password, 10),
          firstName: "Tranche",
          lastName: "Admin",
          role: UserRole.ADMIN,
          adminRole: AdminRole.SUPER_ADMIN,
          status: AccountStatus.ACTIVE,
          creditLimitKobo: 0,
        }),
      );
    }
  }
}
