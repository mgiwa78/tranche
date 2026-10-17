import { Injectable } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import {
  ListOrdersQueryDTO,
  MerchantDashboardView,
  OrderDetailView,
  OrderStatus,
  OrderView,
  OutstandingBalanceView,
  PaginatedResponse,
  PaginationQueryDTO,
} from "@tranche/shared";
import { NotFoundError } from "@/common/errors";
import { getFilterOptions } from "@/common/types";
import { buildMeta, mapPaginated } from "@/common/helpers/list-filter";
import { OrderRepository } from "@/repository/order.repository";
import { InstallmentRepository, LIVE_ORDER_STATUSES } from "@/repository/installment.repository";
import { PayoutService } from "@/core/billing/payout.service";
import { AnalyticsService } from "@/core/analytics.service";
import { loadNames, summarizeInstallments, toOrderDetailView, toOrderView } from "@/core/billing/presenters";

@Injectable()
export class MerchantOrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrderRepository,
    private readonly installments: InstallmentRepository,
    private readonly payouts: PayoutService,
    private readonly analytics: AnalyticsService,
  ) {}

  async list(merchantId: string, query: ListOrdersQueryDTO): Promise<PaginatedResponse<OrderView>> {
    const { merchantId: _m, ...rest } = query;
    const page = await this.orders.list(getFilterOptions(rest), { merchantId });
    const installments = await this.installments.findForOrders(page.data.map((o) => o.id));
    const names = await loadNames(this.dataSource, { userIds: page.data.map((o) => o.customerId) });
    return mapPaginated(page, (o) => toOrderView(o, installments, { customer: names.userName(o.customerId) }));
  }

  async get(merchantId: string, id: string): Promise<OrderDetailView> {
    const order = await this.orders.findOne({ where: { id } });
    if (!order || order.merchantId !== merchantId) throw new NotFoundError("Order not found");
    const [children, names] = await Promise.all([
      this.orders.loadChildren([order.id]),
      loadNames(this.dataSource, { userIds: [order.customerId], merchantIds: [merchantId] }),
    ]);
    return toOrderDetailView(order, children, {
      customer: names.userName(order.customerId),
      merchant: names.merchantName(merchantId),
    });
  }

  /** Live orders with money still owed, most overdue first. */
  async outstanding(merchantId: string, query: PaginationQueryDTO): Promise<PaginatedResponse<OutstandingBalanceView>> {
    const orders = await this.orders.find({
      where: { merchantId, status: In(LIVE_ORDER_STATUSES) },
      order: { createdAt: "DESC" },
    });
    const installments = await this.installments.findForOrders(orders.map((o) => o.id));
    const names = await loadNames(this.dataSource, { userIds: orders.map((o) => o.customerId) });

    let rows: OutstandingBalanceView[] = orders.map((o) => {
      const s = summarizeInstallments(installments.filter((i) => i.orderId === o.id));
      const customer = names.user(o.customerId);
      return {
        orderId: o.id,
        reference: o.reference,
        customerName: names.userName(o.customerId),
        customerEmail: customer?.email ?? null,
        totalKobo: o.totalKobo,
        outstandingKobo: s.outstandingKobo,
        overdueKobo: s.overdueKobo,
        nextDueDate: s.next?.dueDate ?? null,
        status: o.status,
      };
    });
    if (query.search) {
      const q = query.search.toLowerCase();
      rows = rows.filter((r) =>
        [r.reference, r.customerName, r.customerEmail].some((v) => v?.toLowerCase().includes(q)),
      );
    }
    rows.sort((a, b) => b.overdueKobo - a.overdueKobo || (a.nextDueDate ?? "").localeCompare(b.nextDueDate ?? ""));

    const start = (query.page - 1) * query.limit;
    return { data: rows.slice(start, start + query.limit), meta: buildMeta(rows.length, query.page, query.limit) };
  }

  async dashboard(merchantId: string, days: number): Promise<MerchantDashboardView> {
    const [balance, series, counts] = await Promise.all([
      this.payouts.balance(merchantId),
      this.analytics.series(days, merchantId),
      this.analytics.orderStatusCounts(merchantId),
    ]);
    const periodGmvKobo = series.reduce((t, p) => t + p.gmvKobo, 0);
    const periodOrders = series.reduce((t, p) => t + p.orders, 0);
    return {
      balance,
      activeOrders: counts[OrderStatus.ACTIVE] ?? 0,
      completedOrders: counts[OrderStatus.COMPLETED] ?? 0,
      overdueOrders: (counts[OrderStatus.OVERDUE] ?? 0) + (counts[OrderStatus.DEFAULTED] ?? 0),
      periodGmvKobo,
      periodOrders,
      averageOrderKobo: periodOrders ? Math.round(periodGmvKobo / periodOrders) : 0,
      series,
    };
  }
}
