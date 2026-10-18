import { Global, Module, Provider } from "@nestjs/common";
import { DataSource } from "typeorm";
import { RedisClient } from "@/common/redis/client";
import { UserRepository } from "./user.repository";
import { MerchantRepository } from "./merchant.repository";
import { ProductRepository } from "./product.repository";
import { OrderRepository } from "./order.repository";
import { InstallmentRepository } from "./installment.repository";
import { PaymentRepository } from "./payment.repository";
import { PaymentMethodRepository } from "./payment-method.repository";
import { PayoutRepository } from "./payout.repository";
import {
  DeviceTokenRepository,
  NotificationRepository,
  PlatformSettingRepository,
  WebhookEventRepository,
} from "./notification.repository";

type RepositoryClass = new (dataSource: DataSource, redis?: RedisClient) => unknown;

/** Repositories take `(dataSource, redis)`; Nest builds each one once here. */
const repository = (cls: RepositoryClass): Provider => ({
  provide: cls,
  useFactory: (dataSource: DataSource, redis: RedisClient) => new cls(dataSource, redis),
  inject: [DataSource, RedisClient],
});

const REPOSITORIES = [
  UserRepository,
  MerchantRepository,
  ProductRepository,
  OrderRepository,
  InstallmentRepository,
  PaymentRepository,
  PaymentMethodRepository,
  PayoutRepository,
  NotificationRepository,
  DeviceTokenRepository,
  WebhookEventRepository,
  PlatformSettingRepository,
];

@Global()
@Module({
  providers: REPOSITORIES.map(repository),
  exports: REPOSITORIES,
})
export class RepositoryModule {}
