import { DataSource } from "typeorm";
import { MerchantStatus } from "@tranche/shared";
import { Product } from "@/database/entities";
import { RedisClient } from "@/common/redis/client";
import { BaseRepository } from "./base.repository";
import { RequestFilter, buildListFilter } from "@/common/helpers/list-filter";

export class ProductRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(Product, dataSource, redis);
    this.cacheTTL = 120;
  }

  protected getAlias(): string {
    return "product";
  }

  protected getSearchFields(): string[] {
    return ["name", "description"];
  }

  /** Shopper catalog: active products of active merchants only. */
  listCatalog(filter: RequestFilter) {
    return this.findPaginated({
      ...buildListFilter<Product>(filter, {
        filters: ["category", "merchantId"],
        sorts: ["createdAt", "priceKobo", "name"],
        force: { isActive: true },
      }),
      customize: (qb) => {
        qb.innerJoin("merchants", "m", "m.id = product.merchant_id AND m.deleted_at IS NULL")
          .andWhere("m.status = :activeMerchant", { activeMerchant: MerchantStatus.ACTIVE })
          .andWhere("product.stock > 0");
      },
    });
  }

  listForMerchant(merchantId: string, filter: RequestFilter) {
    return this.findPaginated(
      buildListFilter<Product>(filter, {
        filters: ["category", "isActive"],
        sorts: ["createdAt", "priceKobo", "name", "stock"],
        force: { merchantId },
      }),
    );
  }
}
