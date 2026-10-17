import { DataSource, In } from "typeorm";
import { Installment, Order, OrderItem, Payment } from "@/database/entities";
import { RedisClient } from "@/common/redis/client";
import { BaseRepository } from "./base.repository";
import { RequestFilter, buildListFilter } from "@/common/helpers/list-filter";

export class OrderRepository extends BaseRepository<Order> {
  // Money state: always read from Postgres.
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(Order, dataSource, redis);
  }

  protected getAlias(): string {
    return "order";
  }

  protected getSearchFields(): string[] {
    return ["reference"];
  }

  findByReference(reference: string) {
    return this.findOne({ where: { reference } });
  }

  list(filter: RequestFilter, force: Record<string, unknown> = {}) {
    return this.findPaginated(
      buildListFilter<Order>(filter, {
        filters: ["status", "merchantId", "customerId", "planCode"],
        sorts: ["createdAt", "totalKobo"],
        force,
      }),
    );
  }

  /** Everything an order view needs, in three queries for any number of orders. */
  async loadChildren(orderIds: string[]) {
    if (orderIds.length === 0) return { installments: [], items: [], payments: [] };
    const [installments, items, payments] = await Promise.all([
      this.manager.find(Installment, { where: { orderId: In(orderIds) }, order: { sequence: "ASC" } }),
      this.manager.find(OrderItem, { where: { orderId: In(orderIds) }, order: { createdAt: "ASC" } }),
      this.manager.find(Payment, { where: { orderId: In(orderIds) }, order: { createdAt: "DESC" } }),
    ]);
    return { installments, items, payments };
  }
}
