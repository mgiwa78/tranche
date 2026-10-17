import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { dataSourceOptions } from "@/config/data-source";
import { CommonModule } from "@/common/common.module";
import { JwtService } from "@/common/auth/jwt";
import { RedisClient } from "@/common/redis/client";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { AllExceptionsFilter } from "@/common/errors/all-exceptions.filter";
import { ResponseInterceptor } from "@/common/interceptors/response.interceptor";
import { RateLimitPresets } from "@/common/middleware/rate-limiter";
import { RepositoryModule } from "@/repository/repository.module";
import { CoreModule } from "@/core/core.module";
import { GlobalModule } from "@/modules/global/global.module";
import { CustomerModule } from "@/modules/customer/customer.module";
import { MerchantModule } from "@/modules/merchant/merchant.module";
import { AdminModule } from "@/modules/admin/admin.module";

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    CommonModule,
    RepositoryModule,
    CoreModule,
    GlobalModule,
    CustomerModule,
    MerchantModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  constructor(
    private readonly redis: RedisClient,
    private readonly jwtService: JwtService,
  ) {}

  /** The reference's root router order: webhooks first (unlimited), then the general limiter. */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitPresets.general(this.redis, this.jwtService))
      .exclude({ path: "webhooks/*path", method: RequestMethod.ALL }, { path: "health", method: RequestMethod.GET })
      .forRoutes("{*splat}");
    consumer
      .apply(RateLimitPresets.authLogin(this.redis))
      .forRoutes({ path: "auth/login", method: RequestMethod.POST });
    consumer
      .apply(RateLimitPresets.authRegister(this.redis))
      .forRoutes(
        { path: "auth/register", method: RequestMethod.POST },
        { path: "auth/register/merchant", method: RequestMethod.POST },
      );
    consumer
      .apply(RateLimitPresets.payments(this.redis, this.jwtService))
      .forRoutes(
        { path: "customer/checkout", method: RequestMethod.POST },
        { path: "customer/installments/:id/pay", method: RequestMethod.POST },
      );
  }
}
