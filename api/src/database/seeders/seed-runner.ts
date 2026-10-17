import "reflect-metadata";

/**
 * SEED_RESET (default: true, except NODE_ENV=production where it defaults to false)
 *   true  -> drop the schema, re-run migrations, seed settings, staff, catalog, customers and
 *            a realistic order/payment/ledger history.
 *   false -> keep the data, only ensure settings, platform ledger accounts and the super admin.
 *
 * Demo logins (password Tranche123!): admin@tranche.ng, merchant@tranche.ng, customer@tranche.ng
 */
async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const reset = process.env.SEED_RESET === undefined ? !isProduction : process.env.SEED_RESET === "true";

  if (reset) {
    // Fake orders go through the real services; force the in-memory provider and inline queues
    // before config is loaded so no real card or transfer is ever touched.
    process.env.PAYSTACK_SECRET_KEY = "";
    process.env.QUEUE_INLINE = "true";
    process.env.APP_ROLE = "api";
  }

  const { NestFactory } = await import("@nestjs/core");
  const { faker } = await import("@faker-js/faker");
  const { AppModule } = await import("@/app.module");
  const { AppDataSource } = await import("@/config/data-source");
  const { Logger } = await import("@/common/logger");
  const { EssentialSeeder } = await import("./essential.seeder");
  const { CatalogSeeder } = await import("./catalog.seeder");
  const { OrderSeeder } = await import("./order.seeder");

  const logger = new Logger({ level: "info", service: "seed-runner" });
  faker.seed(20261014);

  try {
    if (reset) {
      logger.warn("SEED_RESET: dropping schema and re-running migrations");
      await AppDataSource.initialize();
      await AppDataSource.dropDatabase();
      await AppDataSource.runMigrations();
      await AppDataSource.destroy();
    }

    const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
    const { DataSource } = await import("typeorm");
    const ctx = { app, dataSource: app.get(DataSource), log: (m: string) => logger.info(m) };

    const seeders: [string, { run: (c: typeof ctx) => Promise<void> }][] = [
      ["essentials", new EssentialSeeder()],
      ...(reset
        ? ([
            ["catalog", new CatalogSeeder()],
            ["orders", new OrderSeeder()],
          ] as [string, { run: (c: typeof ctx) => Promise<void> }][])
        : []),
    ];
    for (const [label, seeder] of seeders) {
      logger.info(`Seeding ${label}`);
      await seeder.run(ctx);
    }

    await app.close();
    logger.info(reset ? "All seeding completed successfully" : "Essentials seeded (SEED_RESET=false, no fake data)");
    process.exitCode = 0;
  } catch (err) {
    logger.error("Seeding failed:", err as Error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}

if (require.main === module) void main();
