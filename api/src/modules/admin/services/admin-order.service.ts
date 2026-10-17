import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import {
  InstallmentStatus,
  ListOrdersQueryDTO,
  ListPayoutsQueryDTO,
  OrderDetailView,
  OrderStatus,
  OrderView,
  PaginatedResponse,
  PaymentStatus,
  PayoutView,
} from "@tranche/shared";
import { Installment, Order, Payment } from "@/database/entities";
import { ConflictError, NotFoundError } from "@/common/errors";
import { getFilterOptions } from "@/common/types";
import { mapPaginated } from "@/common/helpers/list-filter";
import { recordAdminAction } from "@/common/monitoring/audit";
import { OrderRepository } from "@/repository/order.repository";
import { InstallmentRepository } from "@/repository/installment.repository";
import { PayoutRepository } from "@/repository/payout.repository";
import { loadNames, toOrderDetailView, toOrderView, toPayoutView } from "@/core/billing/presenters";

@Injectable()
export class AdminOrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrderRepository,
    private readonly installments: InstallmentRepository,
    private readonly payouts: PayoutRepository,
  ) {}

  async list(query: ListOrdersQueryDTO): Promise<PaginatedResponse<OrderView>> {
    const page = await this.orders.list(getFilterOptions(query));
    const installments = await this.installments.findForOrders(page.data.map((o) => o.id));
    const names = await loadNames(this.dataSource, {
      userIds: page.data.map((o) => o.customerId),
      merchantIds: page.data.map((o) => o.merchantId),
    });
    return mapPaginated(page, (o) =>
      toOrderView(o, installments, {
        customer: names.userName(o.customerId),
        merchant: names.merchantName(o.merchantId),
      }),
    );
  }

  async get(id: string): Promise<OrderDetailView> {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundError("Order not found");
    const [children, names] = await Promise.all([
      this.orders.loadChildren([id]),
      loadNames(this.dataSource, { userIds: [order.customerId], merchantIds: [order.merchantId] }),
    ]);
    return toOrderDetailView(order, children, {
      customer: names.userName(order.customerId),
      merchant: names.merchantName(order.merchantId),
    });
  }

  /** Only unfunded orders can be cancelled; once financed, money has moved and the ledger owns it. */
  async cancel(id: string, adminId: string): Promise<OrderDetailView> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager
        .createQueryBuilder(Order, "o")
        .setLock("pessimistic_write")
        .where("o.id = :id", { id })
        .getOne();
      if (!order) throw new NotFoundError("Order not found");
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictError("Only orders awaiting their first payment can be cancelled");
      }
      await manager.update(Order, id, { status: OrderStatus.CANCELLED, cancelledAt: new Date() });
      await manager.update(Installment, { orderId: id }, { status: InstallmentStatus.CANCELLED });
      await manager.update(
        Payment,
        { orderId: id, status: PaymentStatus.PENDING },
        { status: PaymentStatus.ABANDONED },
      );
    });
    recordAdminAction("order.cancel", adminId, "order", id);
    return this.get(id);
  }

  async listPayouts(query: ListPayoutsQueryDTO): Promise<PaginatedResponse<PayoutView>> {
    const page = await this.payouts.list(getFilterOptions(query));
    const names = await loadNames(this.dataSource, { merchantIds: page.data.map((p) => p.merchantId) });
    return mapPaginated(page, (p) => toPayoutView(p, names.merchantName(p.merchantId)));
  }
}
