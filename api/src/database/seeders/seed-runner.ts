import "reflect-metadata";


async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  let reset = process.env.SEED_RESET === undefined ? !isProduction : process.env.SEED_RESET === "true";

  if (reset) {
    process.env.FORCE_FAKE_PAYMENTS = "true";
    process.env.QUEUE_INLINE = "true";
    process.env.APP_ROLE = "api";
  }

  // Config is parsed on first import, so this probe runs only after the env above is set.
  if (reset && process.env.SEED_IF_EMPTY === "true") {
    const { AppDataSource: probe } = await import("@/config/data-source");
    await probe.initialize();
    const [{ count }] = await probe.query("SELECT COUNT(*)::int AS count FROM users").catch(() => [{ count: 0 }]);
    await probe.destroy();
    if (count > 0) reset = false;
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
