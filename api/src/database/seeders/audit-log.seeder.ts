import { DataSource } from "typeorm";
import { faker } from "@faker-js/faker";
import { AccountStatus, MerchantStatus, PayoutStatus, UserRole } from "@tranche/shared";
import { AuditLog, Merchant, Payout, User } from "@/database/entities";
import { seededStaff } from "./user.seeder";

export class AuditLogSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(AuditLog);
    const users = await dataSource.getRepository(User).find();
    const staff = await seededStaff(dataSource);
    const payouts = await dataSource.getRepository(Payout).find();
    const merchants = await dataSource.getRepository(Merchant).find();
    const logs: Partial<AuditLog>[] = [];

    const add = (user: User | undefined, action: string, resourceType: string, resourceId?: string, extra: Partial<AuditLog> = {}) =>
      logs.push({
        userId: user?.id,
        action,
        resourceType,
        resourceId,
        ipAddress: faker.internet.ipv4(),
        userAgent: faker.internet.userAgent(),
        createdAt: faker.date.recent({ days: 30 }),
        ...extra,
      });

    for (let i = 0; i < 200; i++) {
      const user = faker.helpers.arrayElement(users);
      add(user, "auth.login", "user", user.id, { metadata: { role: user.role } });
    }
    for (const payout of payouts.filter((p) => p.reviewedByUserId)) {
      const actor = staff.find((s) => s.id === payout.reviewedByUserId);
      const action = payout.status === PayoutStatus.REJECTED ? "admin.payout.reject" : "admin.payout.approve";
      add(actor, action, "payout", payout.id, {
        metadata: payout.failureReason ? { reason: payout.failureReason } : {},
        createdAt: payout.reviewedAt ?? payout.createdAt,
      });
    }
    for (const merchant of merchants.filter((m) => m.status === MerchantStatus.ACTIVE)) {
      add(faker.helpers.arrayElement(staff), "admin.merchant.status", "merchant", merchant.id, {
        metadata: { from: MerchantStatus.PENDING, to: MerchantStatus.ACTIVE },
        createdAt: new Date(merchant.createdAt.getTime() + 86_400_000),
      });
    }
    for (const user of users.filter((u) => u.role === UserRole.CUSTOMER && u.status === AccountStatus.SUSPENDED)) {
      add(faker.helpers.arrayElement(staff), "admin.customer.update", "user", user.id, {
        metadata: { status: AccountStatus.SUSPENDED },
        createdAt: user.sessionsRevokedAt ?? undefined,
      });
    }
    add(faker.helpers.arrayElement(staff), "admin.settings.update", "platform_settings", "platform", {
      metadata: { graceDays: 3 },
    });

    await repo.save(repo.create(logs), { chunk: 200 });
  }
}
