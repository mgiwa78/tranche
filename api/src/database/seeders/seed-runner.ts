import "reflect-metadata";
import { DataSource } from "typeorm";
import { faker } from "@faker-js/faker";
import { AppDataSource } from "@/config/data-source";
import { Logger } from "@/common/logger";
import { PlatformSettingSeeder } from "./platform-setting.seeder";
import { LedgerAccountSeeder } from "./ledger-account.seeder";
import { AdminSeeder } from "./admin.seeder";
import { UserSeeder } from "./user.seeder";
import { MerchantSeeder } from "./merchant.seeder";
import { ProductSeeder } from "./product.seeder";
import { PaymentMethodSeeder } from "./payment-method.seeder";
import { DeviceTokenSeeder } from "./device-token.seeder";
import { OrderSeeder } from "./order.seeder";
import { PayoutSeeder } from "./payout.seeder";
import { WebhookEventSeeder } from "./webhook-event.seeder";
import { NotificationSeeder } from "./notification.seeder";
import { AuditLogSeeder } from "./audit-log.seeder";

interface Seeder {
  run(dataSource: DataSource): Promise<void>;
}

// Always safe: settings, the platform ledger accounts and the super admins in ADMIN_EMAILS.
const ESSENTIAL: [string, Seeder][] = [
  ["platform settings", new PlatformSettingSeeder()],
  ["platform ledger accounts", new LedgerAccountSeeder()],
  ["admins", new AdminSeeder()],
];

// Faker data for every table; only run on a freshly reset database.
const FAKE: [string, Seeder][] = [
  ["users", new UserSeeder()],
  ["merchants", new MerchantSeeder()],
  ["products", new ProductSeeder()],
  ["payment methods", new PaymentMethodSeeder()],
  ["device tokens", new DeviceTokenSeeder()],
  ["orders, installments, payments and ledger postings", new OrderSeeder()],
  ["payouts", new PayoutSeeder()],
  ["webhook events", new WebhookEventSeeder()],
  ["notifications", new NotificationSeeder()],
  ["audit logs", new AuditLogSeeder()],
];

export async function runSeeders(
  dataSource: DataSource,
  { fake }: { fake: boolean },
  log: (m: string) => void = () => undefined,
) {
  for (const [label, seeder] of [...ESSENTIAL, ...(fake ? FAKE : [])]) {
    log(`Seeding ${label}`);
    await seeder.run(dataSource);
  }
}

/**
 * SEED_RESET (default: true, except NODE_ENV=production where it defaults to false)
 *   true  -> drop the schema, rebuild it, seed settings, admins and faker data for every table.
 *   false -> keep the data, only ensure settings, ledger accounts and admins exist (what prod uses).
 * SEED_IF_EMPTY=true turns a reset into the essentials-only run when users already exist, so a
 * container can seed demo data on its first boot and never wipe it on later deploys.
 *
 * Demo logins (password Tranche123!): customer@tranche.ng, merchant@tranche.ng, support@tranche.ng,
 * and the super admins in ADMIN_EMAILS (password SEED_ADMIN_PASSWORD).
 */
async function main() {
  const logger = new Logger({ level: "info", service: "seed-runner" });
  const isProduction = process.env.NODE_ENV === "production";
  let reset = process.env.SEED_RESET === undefined ? !isProduction : process.env.SEED_RESET === "true";
  faker.seed(20261014);

  try {
    await AppDataSource.initialize();

    if (reset && process.env.SEED_IF_EMPTY === "true") {
      const [{ count }] = await AppDataSource.query("SELECT COUNT(*)::int AS count FROM users").catch(() => [
        { count: 0 },
      ]);
      if (count > 0) {
        logger.info("SEED_IF_EMPTY: database already has users, keeping data");
        reset = false;
      }
    }

    if (reset) {
      logger.warn("SEED_RESET: dropping schema and rebuilding it from the migrations");
      await AppDataSource.dropDatabase();
      // The migrations (not synchronize) build the schema, so the ledger triggers exist too.
      await AppDataSource.runMigrations();
    }

    await runSeeders(AppDataSource, { fake: reset }, (m) => logger.info(m));
    logger.info(
      reset ? "All seeding completed successfully" : "Settings and admins seeded (SEED_RESET=false, no fake data)",
    );
    process.exitCode = 0;
  } catch (err) {
    logger.error("Seeding failed:", err as Error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}

if (require.main === module) void main();
