import { DataSource } from "typeorm";
import { Merchant } from "@/database/entities";
import { RedisClient } from "@/common/redis/client";
import { BaseRepository } from "./base.repository";
import { RequestFilter, buildListFilter } from "@/common/helpers/list-filter";

export class MerchantRepository extends BaseRepository<Merchant> {
  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(Merchant, dataSource, redis);
    this.cacheTTL = 300;
  }

  protected getAlias(): string {
    return "merchant";
  }

  protected getSearchFields(): string[] {
    return ["name", "slug", "supportEmail"];
  }

  findBySlug(slug: string) {
    return this.findOne({ where: { slug } });
  }

  listPaginated(filter: RequestFilter) {
    return this.findPaginated(buildListFilter<Merchant>(filter, { filters: ["status"], sorts: ["createdAt", "name"] }));
  }
}
