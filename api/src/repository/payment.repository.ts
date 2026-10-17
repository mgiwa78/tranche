import { DataSource } from "typeorm";
import { Payment } from "@/database/entities";
import { RedisClient } from "@/common/redis/client";
import { BaseRepository } from "./base.repository";
import { RequestFilter, buildListFilter } from "@/common/helpers/list-filter";

export class PaymentRepository extends BaseRepository<Payment> {
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(Payment, dataSource, redis);
  }

  protected getAlias(): string {
    return "payment";
  }

  protected getSearchFields(): string[] {
    return ["reference"];
  }

  findByReference(reference: string) {
    return this.findOne({ where: { reference } });
  }

  list(filter: RequestFilter, force: Record<string, unknown>) {
    return this.findPaginated(
      buildListFilter<Payment>(filter, { filters: ["status", "orderId"], sorts: ["createdAt", "amountKobo"], force }),
    );
  }
}
