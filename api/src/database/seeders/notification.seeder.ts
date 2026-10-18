import { DataSource, In } from "typeorm";
import { faker } from "@faker-js/faker";
import {
  InstallmentStatus,
  NotificationType,
  OrderStatus,
  PaymentChannel,
  PaymentStatus,
  PayoutStatus,
  daysBetween,
  formatNaira,
} from "@tranche/shared";
import { Installment, Merchant, Notification, Order, Payment, Payout } from "@/database/entities";
import { todayIso } from "@/common/helpers/dates";
import { reminderCopy } from "@/core/billing/reminder.service";

/** The in-app inbox each shopper (and merchant owner) would have from the seeded activity. */
export class NotificationSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Notification);
    const today = todayIso();
    const merchants = new Map((await dataSource.getRepository(Merchant).find()).map((m) => [m.id, m]));
    const orders = new Map((await dataSource.getRepository(Order).find()).map((o) => [o.id, o]));
    const rows: Partial<Notification>[] = [];
    const push = (userId: string, type: NotificationType, title: string, body: string, at: Date, data: Record<string, string>) =>
      rows.push({
        userId,
        type,
        title,
        body,
        data,
        // Anything older than a few days has been seen.
        readAt: Date.now() - at.getTime() > 3 * 86_400_000 ? new Date(at.getTime() + 3_600_000) : null,
        createdAt: at,
      });

    const payments = await dataSource
      .getRepository(Payment)
      .find({ where: { status: In([PaymentStatus.SUCCESS, PaymentStatus.FAILED]) } });
    for (const p of payments) {
      const order = orders.get(p.orderId);
      if (!order) continue;
      if (p.status === PaymentStatus.SUCCESS) {
        push(p.customerId, NotificationType.PAYMENT_RECEIVED, "Payment received", `We received ${formatNaira(p.amountKobo)} for order ${order.reference}.`, p.paidAt ?? p.createdAt, {
          orderId: order.id,
          reference: p.reference,
        });
      } else if (p.channel === PaymentChannel.CARD_ON_FILE) {
        push(
          p.customerId,
          NotificationType.PAYMENT_FAILED,
          "Payment didn't go through",
          `We couldn't charge your card ${formatNaira(p.amountKobo)} for order ${order.reference}. Tap to pay now.`,
          p.createdAt,
          { orderId: order.id, reference: p.reference },
        );
      }
    }

    for (const order of orders.values()) {
      if (order.status === OrderStatus.COMPLETED && order.completedAt) {
        push(order.customerId, NotificationType.ORDER_COMPLETED, "Paid in full", `Order ${order.reference} is fully paid. Nice work.`, new Date(order.completedAt.getTime() + 1_000), {
          orderId: order.id,
        });
      }
    }

    const open = await dataSource.getRepository(Installment).find({
      where: { status: In([InstallmentStatus.PENDING, InstallmentStatus.OVERDUE]) },
    });
    for (const i of open) {
      const order = orders.get(i.orderId);
      if (!order || ![OrderStatus.ACTIVE, OrderStatus.OVERDUE, OrderStatus.DEFAULTED].includes(order.status)) continue;
      const days = daysBetween(today, i.dueDate);
      const type =
        i.status === InstallmentStatus.OVERDUE
          ? NotificationType.INSTALLMENT_OVERDUE
          : days === 0
            ? NotificationType.INSTALLMENT_DUE_TODAY
            : days > 0 && days <= 3
              ? NotificationType.INSTALLMENT_DUE_SOON
              : null;
      if (!type) continue;
      const copy = reminderCopy(type, i.amountKobo + i.lateFeeKobo, merchants.get(i.merchantId)?.name ?? null, i.dueDate);
      push(order.customerId, type, copy.title, copy.body, faker.date.recent({ days: 2 }), {
        orderId: order.id,
        installmentId: i.id,
      });
    }

    for (const payout of await dataSource.getRepository(Payout).find({ where: { status: PayoutStatus.PAID } })) {
      const owner = merchants.get(payout.merchantId)?.ownerUserId;
      if (!owner) continue;
      push(owner, NotificationType.PAYOUT_PAID, "Payout sent", `${formatNaira(payout.amountKobo)} is on its way to your bank account.`, payout.processedAt ?? payout.createdAt, {
        payoutId: payout.id,
      });
    }

    await repo.save(repo.create(rows), { chunk: 200 });
  }
}
