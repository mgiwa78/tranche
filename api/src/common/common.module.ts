import { Global, Module, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Config } from "@/config";
import { JwtService } from "./auth/jwt";
import { RedisClient } from "./redis/client";
import { AuditLogger } from "./monitoring/audit";
import { HealthMonitor } from "./monitoring/health";

/**
 * The reference's `config/int-services.ts` singletons (jwt, redis) as global providers,
 * plus the AuditLogger / HealthMonitor singletons initialised against Nest's DataSource.
 */
@Global()
@Module({
  providers: [
    {
      provide: JwtService,
      useFactory: () => {
        if (!Config.jwt.privateKey || !Config.jwt.publicKey) {
          throw new Error("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required (run `pnpm --filter api keys:generate`).");
        }
        return new JwtService(Config.jwt.privateKey, Config.jwt.publicKey, Config.jwt.accessTtl);
      },
    },
    {
      provide: RedisClient,
      useFactory: () => new RedisClient({ keyPrefix: Config.redis.keyPrefix, ttl: Config.redis.ttl }),
    },
  ],
  exports: [JwtService, RedisClient],
})
export class CommonModule implements OnModuleInit, OnApplicationShutdown {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisClient,
  ) {}

  onModuleInit() {
    AuditLogger.initialize(this.dataSource);
    HealthMonitor.initialize(this.dataSource, this.redis);
  }

  async onApplicationShutdown() {
    await AuditLogger.getInstance()
      .flushLogs()
      .catch(() => undefined);
    await this.redis.redis.quit().catch(() => undefined);
  }
}
