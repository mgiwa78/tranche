import { DataSource, In } from "typeorm";
import { PayoutStatus } from "@tranche/shared";
import { Payout } from "@/database/entities";
import { RedisClient } from "@/common/redis/client";
import { BaseRepository } from "./base.repository";
import { RequestFilter, buildListFilter } from "@/common/helpers/list-filter";

export const IN_FLIGHT_PAYOUT_STATUSES = [PayoutStatus.REQUESTED, PayoutStatus.APPROVED, PayoutStatus.PROCESSING];

export class PayoutRepository extends BaseRepository<Payout> {
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(Payout, dataSource, redis);
  }

  protected getAlias(): string {
    return "payout";
  }

  protected getSearchFields(): string[] {
    return ["reference"];
  }

  list(filter: RequestFilter, force: Record<string, unknown> = {}) {
    return this.findPaginated(
      buildListFilter<Payout>(filter, { filters: ["status", "merchantId"], sorts: ["createdAt", "amountKobo"], force }),
    );
  }

  async sumByStatus(merchantId: string, statuses: PayoutStatus[]): Promise<number> {
    const row = await this.createQueryBuilder("p")
      .select("COALESCE(SUM(p.amount_kobo), 0)", "total")
      .where("p.merchant_id = :merchantId", { merchantId })
      .andWhere({ status: In(statuses) })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }
}
