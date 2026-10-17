import { DataSource } from "typeorm";
import { PaymentMethod } from "@/database/entities";
import { RedisClient } from "@/common/redis/client";
import { BaseRepository } from "./base.repository";

export class PaymentMethodRepository extends BaseRepository<PaymentMethod> {
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(PaymentMethod, dataSource, redis);
  }

  protected getAlias(): string {
    return "pm";
  }

  listForCustomer(customerId: string) {
    return this.find({ where: { customerId }, order: { isDefault: "DESC", createdAt: "DESC" } });
  }

  findDefault(customerId: string) {
    return this.findOne({ where: { customerId, reusable: true }, order: { isDefault: "DESC", createdAt: "DESC" } });
  }
}
