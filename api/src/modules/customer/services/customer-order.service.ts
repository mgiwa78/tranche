import { Injectable } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import {
  CustomerSummaryView,
  InstallmentStatus,
  ListOrdersQueryDTO,
  ListPaymentsQueryDTO,
  OrderDetailView,
  OrderStatus,
  OrderView,
  PaginatedResponse,
  PaymentMethodView,
  PaymentVerificationView,
  PaymentView,
} from "@tranche/shared";
import { Installment, Order, PaymentMethod, User } from "@/database/entities";
import { ForbiddenError, NotFoundError } from "@/common/errors";
import { getFilterOptions } from "@/common/types";
import { mapPaginated } from "@/common/helpers/list-filter";
import { OrderRepository } from "@/repository/order.repository";
import { InstallmentRepository, LIVE_ORDER_STATUSES } from "@/repository/installment.repository";
import { PaymentRepository } from "@/repository/payment.repository";
import { PaymentMethodRepository } from "@/repository/payment-method.repository";
import { CollectionService } from "@/core/billing/collection.service";
import {
  loadNames,
  toOrderDetailView,
  toOrderView,
  toPaymentMethodView,
  toPaymentView,
} from "@/core/billing/presenters";

@Injectable()
export class CustomerOrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrderRepository,
    private readonly installments: InstallmentRepository,
    private readonly payments: PaymentRepository,
    private readonly paymentMethods: PaymentMethodRepository,
    private readonly collection: CollectionService,
  ) {}

  async list(customer: User, query: ListOrdersQueryDTO): Promise<PaginatedResponse<OrderView>> {
    const { customerId: _ignored, ...rest } = query;
    const page = await this.orders.list(getFilterOptions(rest), { customerId: customer.id });
    const installments = await this.installments.findForOrders(page.data.map((o) => o.id));
    const names = await loadNames(this.dataSource, { merchantIds: page.data.map((o) => o.merchantId) });
    return mapPaginated(page, (o) => toOrderView(o, installments, { merchant: names.merchantName(o.merchantId) }));
  }

  async get(customer: User, orderId: string): Promise<OrderDetailView> {
    const order = await this.ownedOrder(customer, orderId);
    const [children, names] = await Promise.all([
      this.orders.loadChildren([order.id]),
      loadNames(this.dataSource, { merchantIds: [order.merchantId] }),
    ]);
    return toOrderDetailView(order, children, {
      customer: `${customer.firstName} ${customer.lastName}`,
      merchant: names.merchantName(order.merchantId),
    });
  }

  async summary(customer: User): Promise<CustomerSummaryView> {
    const outstandingKobo = await this.installments.outstandingForCustomer(customer.id);
    const counts = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder("o")
      .select("o.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .where("o.customer_id = :id", { id: customer.id })
      .groupBy("o.status")
      .getRawMany<{ status: OrderStatus; count: number }>();
    const count = (statuses: OrderStatus[]) =>
      counts.filter((c) => statuses.includes(c.status)).reduce((t, c) => t + Number(c.count), 0);

    const next = await this.dataSource
      .getRepository(Installment)
      .createQueryBuilder("i")
      .innerJoin(Order, "o", "o.id = i.order_id")
      .where("i.customer_id = :id", { id: customer.id })
      .andWhere("i.status IN (:...statuses)", {
        statuses: [InstallmentStatus.PENDING, InstallmentStatus.FAILED, InstallmentStatus.OVERDUE],
      })
      .andWhere("o.status IN (:...live)", { live: LIVE_ORDER_STATUSES })
      .orderBy("i.due_date", "ASC")
      .getOne();
    const names = next ? await loadNames(this.dataSource, { merchantIds: [next.merchantId] }) : null;

    return {
      creditLimitKobo: customer.creditLimitKobo,
      availableCreditKobo: Math.max(0, customer.creditLimitKobo - outstandingKobo),
      outstandingKobo,
      activeOrders: count(LIVE_ORDER_STATUSES),
      completedOrders: count([OrderStatus.COMPLETED]),
      nextDue: next
        ? {
            orderId: next.orderId,
            installmentId: next.id,
            merchantName: names!.merchantName(next.merchantId),
            amountKobo: next.amountKobo + next.lateFeeKobo,
            dueDate: next.dueDate,
            status: next.status,
          }
        : null,
    };
  }

  async payInstallment(customer: User, installmentId: string, paymentMethodId?: string) {
    const installment = await this.installments.findOne({ where: { id: installmentId } });
    if (!installment) throw new NotFoundError("Installment not found");
    if (installment.customerId !== customer.id) throw new ForbiddenError("This isn't your installment");
    return this.collection.collectInstallment(installmentId, {
      channel: paymentMethodId ? "card" : "auto",
      paymentMethodId,
      initiatedBy: "customer",
    });
  }

  /** Called by the app when the checkout browser returns. Verifies with Paystack server-side. */
  async verify(customer: User, reference: string): Promise<PaymentVerificationView> {
    const payment = await this.payments.findByReference(reference);
    if (!payment) throw new NotFoundError("Payment not found");
    if (payment.customerId !== customer.id) throw new ForbiddenError("This isn't your payment");
    const settled = await this.collection.settle(reference);
    const installments = await this.installments.findForOrders([settled.order.id]);
    const names = await loadNames(this.dataSource, { merchantIds: [settled.order.merchantId] });
    return {
      reference,
      status: settled.payment.status,
      order: toOrderView(settled.order, installments, { merchant: names.merchantName(settled.order.merchantId) }),
    };
  }

  async listPayments(customer: User, query: ListPaymentsQueryDTO): Promise<PaginatedResponse<PaymentView>> {
    const page = await this.payments.list(getFilterOptions(query), { customerId: customer.id });
    return mapPaginated(page, toPaymentView);
  }

  async listPaymentMethods(customer: User): Promise<PaymentMethodView[]> {
    return (await this.paymentMethods.listForCustomer(customer.id)).map(toPaymentMethodView);
  }

  async setDefaultPaymentMethod(customer: User, id: string): Promise<PaymentMethodView[]> {
    const method = await this.paymentMethods.findOne({ where: { id, customerId: customer.id } });
    if (!method) throw new NotFoundError("Card not found");
    await this.dataSource.transaction(async (manager) => {
      await manager.update(PaymentMethod, { customerId: customer.id }, { isDefault: false });
      await manager.update(PaymentMethod, { id }, { isDefault: true });
    });
    return this.listPaymentMethods(customer);
  }

  async removePaymentMethod(customer: User, id: string): Promise<PaymentMethodView[]> {
    const method = await this.paymentMethods.findOne({ where: { id, customerId: customer.id } });
    if (!method) throw new NotFoundError("Card not found");
    await this.paymentMethods.softDelete({ id });
    if (method.isDefault) {
      const next = await this.paymentMethods.findOne({
        where: { customerId: customer.id },
        order: { createdAt: "DESC" },
      });
      if (next) await this.paymentMethods.update(next.id, { isDefault: true });
    }
    return this.listPaymentMethods(customer);
  }

  private async ownedOrder(customer: User, orderId: string) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    // 404 rather than 403 so ids of other customers' orders can't be probed.
    if (!order || order.customerId !== customer.id) throw new NotFoundError("Order not found");
    return order;
  }

  async activeOrderIds(customer: User) {
    const rows = await this.orders.find({
      where: { customerId: customer.id, status: In(LIVE_ORDER_STATUSES) },
      select: ["id"],
    });
    return rows.map((r) => r.id);
  }
}
