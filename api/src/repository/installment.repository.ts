import { DataSource, In } from "typeorm";
import { InstallmentStatus, OrderStatus } from "@tranche/shared";
import { Installment } from "@/database/entities";
import { RedisClient } from "@/common/redis/client";
import { BaseRepository } from "./base.repository";

export const UNPAID_STATUSES = [InstallmentStatus.PENDING, InstallmentStatus.FAILED, InstallmentStatus.OVERDUE];
export const LIVE_ORDER_STATUSES = [OrderStatus.ACTIVE, OrderStatus.OVERDUE];

export class InstallmentRepository extends BaseRepository<Installment> {
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(Installment, dataSource, redis);
  }

  protected getAlias(): string {
    return "installment";
  }

  /** Unpaid installments due on or before `date` on live orders (the auto-charge queue). */
  findChargeable(date: string, maxAttempts: number) {
    return this.createQueryBuilder("i")
      .innerJoin("orders", "o", "o.id = i.order_id")
      .where("i.status IN (:...statuses)", { statuses: UNPAID_STATUSES })
      .andWhere("i.due_date <= :date", { date })
      .andWhere("i.attempt_count < :maxAttempts", { maxAttempts })
      .andWhere("o.status IN (:...live)", { live: LIVE_ORDER_STATUSES })
      .andWhere("(i.last_attempt_at IS NULL OR i.last_attempt_at < now() - interval '20 hours')")
      .orderBy("i.due_date", "ASC")
      .limit(500)
      .getMany();
  }

  findUnpaidDueOn(date: string) {
    return this.createQueryBuilder("i")
      .innerJoin("orders", "o", "o.id = i.order_id")
      .where("i.status IN (:...statuses)", { statuses: [InstallmentStatus.PENDING, InstallmentStatus.FAILED] })
      .andWhere("i.due_date = :date", { date })
      .andWhere("o.status IN (:...live)", { live: LIVE_ORDER_STATUSES })
      .getMany();
  }

  findOverdue() {
    return this.find({ where: { status: InstallmentStatus.OVERDUE } });
  }

  /** Unpaid and past due (strictly before `today`): candidates to flip to OVERDUE. */
  findPastDue(today: string) {
    return this.createQueryBuilder("i")
      .innerJoin("orders", "o", "o.id = i.order_id")
      .where("i.status IN (:...statuses)", { statuses: [InstallmentStatus.PENDING, InstallmentStatus.FAILED] })
      .andWhere("i.due_date < :today", { today })
      .andWhere("o.status IN (:...live)", { live: LIVE_ORDER_STATUSES })
      .getMany();
  }

  /** Sum still owed by a customer on live orders. */
  async outstandingForCustomer(customerId: string): Promise<number> {
    const row = await this.createQueryBuilder("i")
      .innerJoin("orders", "o", "o.id = i.order_id")
      .select("COALESCE(SUM(i.amount_kobo + i.late_fee_kobo), 0)", "total")
      .where("i.customer_id = :customerId", { customerId })
      .andWhere("i.status IN (:...statuses)", { statuses: UNPAID_STATUSES })
      .andWhere("o.status IN (:...live)", { live: LIVE_ORDER_STATUSES })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  async outstandingForMerchant(merchantId: string): Promise<{ outstanding: number; overdue: number }> {
    const row = await this.createQueryBuilder("i")
      .innerJoin("orders", "o", "o.id = i.order_id")
      .select("COALESCE(SUM(i.amount_kobo + i.late_fee_kobo), 0)", "outstanding")
      .addSelect(
        `COALESCE(SUM(CASE WHEN i.status = '${InstallmentStatus.OVERDUE}' THEN i.amount_kobo + i.late_fee_kobo ELSE 0 END), 0)`,
        "overdue",
      )
      .where("i.merchant_id = :merchantId", { merchantId })
      .andWhere("i.status IN (:...statuses)", { statuses: UNPAID_STATUSES })
      .andWhere("o.status IN (:...live)", { live: LIVE_ORDER_STATUSES })
      .getRawOne<{ outstanding: string; overdue: string }>();
    return { outstanding: Number(row?.outstanding ?? 0), overdue: Number(row?.overdue ?? 0) };
  }

  findForOrders(orderIds: string[]) {
    if (orderIds.length === 0) return Promise.resolve([] as Installment[]);
    return this.find({ where: { orderId: In(orderIds) }, order: { sequence: "ASC" } });
  }
}
