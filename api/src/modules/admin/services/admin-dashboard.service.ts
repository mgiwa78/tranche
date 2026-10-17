import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AdminDashboardView, OrderStatus, PayoutStatus, PlatformAccount, UserRole } from "@tranche/shared";
import { LedgerService } from "@/core/ledger/ledger.service";
import { AnalyticsService } from "@/core/analytics.service";

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
    private readonly analytics: AnalyticsService,
  ) {}

  async get(days: number): Promise<AdminDashboardView> {
    const [[totals], [receivables], [people], [payouts], counts, feeRevenueKobo, series] = await Promise.all([
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_kobo) FILTER (WHERE activated_at IS NOT NULL), 0) AS gmv,
                COUNT(*) FILTER (WHERE activated_at IS NOT NULL) AS financed,
                COUNT(*) FILTER (WHERE status = $1) AS defaulted
           FROM orders`,
        [OrderStatus.DEFAULTED],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(i.amount_kobo + i.late_fee_kobo) FILTER (WHERE i.status IN ('pending','failed','overdue')), 0) AS outstanding,
                COALESCE(SUM(i.amount_kobo + i.late_fee_kobo) FILTER (WHERE i.status = 'overdue'), 0) AS overdue,
                (SELECT COALESCE(SUM(amount_kobo), 0) FROM payments WHERE status = 'success') AS collected
           FROM installments i JOIN orders o ON o.id = i.order_id
          WHERE o.status IN ('active','overdue','defaulted')`,
      ),
      this.dataSource.query(
        `SELECT (SELECT COUNT(*) FROM users WHERE role = $1 AND deleted_at IS NULL) AS customers,
                (SELECT COUNT(*) FROM merchants WHERE deleted_at IS NULL) AS merchants`,
        [UserRole.CUSTOMER],
      ),
      this.dataSource.query(`SELECT COUNT(*) AS pending FROM payouts WHERE status = $1`, [PayoutStatus.REQUESTED]),
      this.analytics.orderStatusCounts(),
      this.ledger.balanceOf(PlatformAccount.FEE_REVENUE),
      this.analytics.series(days),
    ]);

    const financed = Number(totals.financed);
    return {
      gmvKobo: Number(totals.gmv),
      collectedKobo: Number(receivables.collected),
      outstandingKobo: Number(receivables.outstanding),
      overdueKobo: Number(receivables.overdue),
      feeRevenueKobo,
      activeOrders: (counts[OrderStatus.ACTIVE] ?? 0) + (counts[OrderStatus.OVERDUE] ?? 0),
      customers: Number(people.customers),
      merchants: Number(people.merchants),
      pendingPayouts: Number(payouts.pending),
      defaultRate: financed ? Number(totals.defaulted) / financed : 0,
      series,
    };
  }
}
