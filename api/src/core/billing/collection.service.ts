import { Inject, Injectable } from "@nestjs/common";
import { DataSource, EntityManager, In, MoreThan } from "typeorm";
import {
  InstallmentStatus,
  NotificationType,
  OrderStatus,
  PaymentAttemptView,
  PaymentChannel,
  PaymentStatus,
  formatNaira,
} from "@tranche/shared";
import { Installment, Order, OrderItem, Payment, PaymentMethod, Product, User } from "@/database/entities";
import { Logger } from "@/common/logger";
import { Config, paystackCallbackUrl } from "@/config";
import { BadRequestError, ConflictError, NotFoundError } from "@/common/errors";
import { createReference, decryptSecret, encryptSecret } from "@/common/crypto";
import { LedgerService } from "../ledger/ledger.service";
import { installmentCollectedPosting, orderFinancedPosting } from "../ledger/postings";
import { NotificationDispatcher } from "../notification.dispatcher";
import { EmailService } from "../email.service";
import { ChargeResult, PAYMENT_PROVIDER, PaymentProvider } from "../payments/payment-provider.interface";
import { fullName } from "./presenters";

export type CollectionChannel = "auto" | "checkout" | "card";

export interface CollectOptions {
  channel: CollectionChannel;
  paymentMethodId?: string;
  /** `system` = scheduled auto-charge (never opens a checkout page). */
  initiatedBy: "customer" | "system";
}

export type SettleOutcome = "paid" | "failed" | "pending" | "already_settled";

export interface SettleResult {
  outcome: SettleOutcome;
  payment: Payment;
  order: Order;
}

const COLLECTABLE_ORDER_STATUSES = [OrderStatus.PENDING_PAYMENT, OrderStatus.ACTIVE, OrderStatus.OVERDUE];
const UNPAID = [InstallmentStatus.PENDING, InstallmentStatus.FAILED, InstallmentStatus.OVERDUE];

/**
 * Collects installments and settles payments. `settle` is the single place money state
 * changes: it is called by the shopper's verify call, the Paystack webhook and the
 * auto-charge job, and is idempotent under row locks so any of them can arrive first,
 * twice, or concurrently.
 */
@Injectable()
export class CollectionService {
  private logger = new Logger({ level: Config.logging.level, service: "collection" });

  constructor(
    private readonly dataSource: DataSource,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly ledger: LedgerService,
    private readonly dispatcher: NotificationDispatcher,
    private readonly email: EmailService,
  ) {}

  async collectInstallment(installmentId: string, opts: CollectOptions): Promise<PaymentAttemptView> {
    const manager = this.dataSource.manager;
    const installment = await manager.findOne(Installment, { where: { id: installmentId } });
    if (!installment) throw new NotFoundError("Installment not found");
    if (!UNPAID.includes(installment.status)) throw new ConflictError("This installment is already settled");

    const order = await manager.findOneOrFail(Order, { where: { id: installment.orderId } });
    if (!COLLECTABLE_ORDER_STATUSES.includes(order.status)) {
      throw new ConflictError("Payments are closed for this order");
    }
    if (order.status === OrderStatus.PENDING_PAYMENT && installment.sequence !== 1) {
      throw new BadRequestError("Pay the first installment to start this plan");
    }

    const customer = await manager.findOneOrFail(User, { where: { id: installment.customerId } });

    // Re-opening the checkout within 30 minutes reuses the same Paystack session.
    if (opts.channel !== "card" && opts.initiatedBy === "customer" && !opts.paymentMethodId) {
      const open = await manager.findOne(Payment, {
        where: {
          installmentId,
          status: PaymentStatus.PENDING,
          channel: PaymentChannel.CHECKOUT,
          createdAt: MoreThan(new Date(Date.now() - 30 * 60 * 1000)),
        },
        order: { createdAt: "DESC" },
      });
      if (open?.authorizationUrl && opts.channel === "checkout") {
        return { reference: open.reference, status: open.status, authorizationUrl: open.authorizationUrl };
      }
    }

    const method = await this.resolvePaymentMethod(customer.id, opts);
    if (!method && (opts.channel === "card" || opts.initiatedBy === "system")) {
      throw new BadRequestError("No saved card to charge. Add a card by paying with checkout first.");
    }

    const amountKobo = installment.amountKobo + installment.lateFeeKobo;
    const payment = await manager.save(
      manager.create(Payment, {
        reference: createReference("TRP"),
        orderId: order.id,
        installmentId: installment.id,
        customerId: customer.id,
        merchantId: order.merchantId,
        provider: this.provider.name,
        channel: method ? PaymentChannel.CARD_ON_FILE : PaymentChannel.CHECKOUT,
        amountKobo,
        status: PaymentStatus.PENDING,
        paymentMethodId: method?.id ?? null,
        cardLast4: method?.last4 ?? null,
      }),
    );

    const metadata = {
      orderId: order.id,
      orderReference: order.reference,
      installmentId: installment.id,
      sequence: String(installment.sequence),
    };

    if (!method) {
      const { authorizationUrl } = await this.provider.initialize({
        email: customer.email,
        amountKobo,
        reference: payment.reference,
        callbackUrl: paystackCallbackUrl(),
        metadata,
      });
      await manager.update(Payment, payment.id, { authorizationUrl });
      return { reference: payment.reference, status: PaymentStatus.PENDING, authorizationUrl };
    }

    await manager.update(Installment, installment.id, {
      attemptCount: () => "attempt_count + 1",
      lastAttemptAt: new Date(),
    });

    const result = await this.provider.chargeAuthorization({
      email: customer.email,
      amountKobo,
      reference: payment.reference,
      authorizationCode: decryptSecret(method.authorizationCode),
      metadata,
    });
    const settled = await this.settle(payment.reference, result);
    return { reference: payment.reference, status: settled.payment.status, authorizationUrl: null };
  }

  private async resolvePaymentMethod(customerId: string, opts: CollectOptions): Promise<PaymentMethod | null> {
    const repo = this.dataSource.getRepository(PaymentMethod);
    if (opts.paymentMethodId) {
      const method = await repo.findOne({ where: { id: opts.paymentMethodId, customerId } });
      if (!method) throw new NotFoundError("Card not found");
      if (!method.reusable) throw new BadRequestError("This card can't be charged again; pay with checkout");
      return method;
    }
    if (opts.channel === "checkout") return null;
    return repo.findOne({ where: { customerId, reusable: true }, order: { isDefault: "DESC", createdAt: "DESC" } });
  }

  /**
   * Applies a provider result to a payment. When `result` is omitted the provider is asked
   * (we never trust a webhook payload or a client for the amount or status).
   */
  async settle(reference: string, result?: ChargeResult): Promise<SettleResult> {
    const verified = result ?? (await this.provider.verify(reference));

    const settled = await this.dataSource.transaction(async (manager) => {
      const payment = await manager
        .createQueryBuilder(Payment, "p")
        .setLock("pessimistic_write")
        .where("p.reference = :reference", { reference })
        .getOne();
      if (!payment) throw new NotFoundError("Payment not found");

      const order = await manager
        .createQueryBuilder(Order, "o")
        .setLock("pessimistic_write")
        .where("o.id = :id", { id: payment.orderId })
        .getOneOrFail();

      if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.FAILED) {
        return { outcome: "already_settled" as const, payment, order };
      }

      if (verified.status === PaymentStatus.PENDING) {
        return { outcome: "pending" as const, payment, order };
      }

      if (verified.status === PaymentStatus.SUCCESS && verified.amountKobo !== payment.amountKobo) {
        this.logger.error("Paid amount does not match payment", undefined, {
          reference,
          expected: payment.amountKobo,
          received: verified.amountKobo,
        });
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = "Amount mismatch - flagged for review";
        await manager.save(payment);
        return { outcome: "failed" as const, payment, order };
      }

      if (verified.status !== PaymentStatus.SUCCESS) {
        payment.status = verified.status;
        payment.failureReason = verified.gatewayResponse ?? "Payment was not completed";
        await manager.save(payment);
        if (payment.channel === PaymentChannel.CARD_ON_FILE && payment.installmentId) {
          await manager.update(
            Installment,
            { id: payment.installmentId, status: InstallmentStatus.PENDING },
            { status: InstallmentStatus.FAILED },
          );
        }
        return { outcome: "failed" as const, payment, order };
      }

      await this.applySuccessfulPayment(manager, payment, order, verified);
      return { outcome: "paid" as const, payment, order };
    });

    await this.afterSettle(settled).catch((error) =>
      this.logger.error("Post-settlement side effects failed", error as Error, { reference }),
    );
    return settled;
  }

  private async applySuccessfulPayment(manager: EntityManager, payment: Payment, order: Order, verified: ChargeResult) {
    const customer = await manager.findOneOrFail(User, { where: { id: payment.customerId } });

    if (verified.authorization?.reusable) {
      payment.paymentMethodId = await this.saveCard(manager, customer.id, verified);
      payment.cardLast4 = verified.authorization.last4;
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.paidAt = verified.paidAt ?? new Date();
    payment.providerTransactionId = verified.providerTransactionId;
    payment.failureReason = null;
    await manager.save(payment);

    if (payment.installmentId) {
      const installment = await manager
        .createQueryBuilder(Installment, "i")
        .setLock("pessimistic_write")
        .where("i.id = :id", { id: payment.installmentId })
        .getOneOrFail();
      if (installment.status === InstallmentStatus.PAID) {
        // Two payments for one installment (e.g. a manual pay racing the auto-charge). The money
        // is real, so it still lands in the ledger and shows as a credit on the receivable.
        this.logger.warn("Installment paid twice", { installmentId: installment.id, reference: payment.reference });
      } else {
        installment.status = InstallmentStatus.PAID;
        installment.paidAt = payment.paidAt;
        await manager.save(installment);
      }
    }

    if (order.status === OrderStatus.PENDING_PAYMENT) {
      order.status = OrderStatus.ACTIVE;
      order.activatedAt = new Date();
      const merchantName = await this.merchantName(manager, order.merchantId);
      await this.ledger.post(
        manager,
        orderFinancedPosting({
          orderId: order.id,
          orderReference: order.reference,
          customerId: order.customerId,
          customerName: fullName(customer) ?? undefined,
          merchantId: order.merchantId,
          merchantName,
          totalKobo: order.totalKobo,
          feeKobo: order.feeKobo,
        }),
      );
      await this.decrementStock(manager, order.id);
    }

    await this.ledger.post(
      manager,
      installmentCollectedPosting({
        paymentId: payment.id,
        paymentReference: payment.reference,
        orderId: order.id,
        installmentId: payment.installmentId ?? order.id,
        customerId: order.customerId,
        customerName: fullName(customer) ?? undefined,
        amountKobo: payment.amountKobo,
      }),
    );

    const remaining = await manager.find(Installment, { where: { orderId: order.id, status: In(UNPAID) } });
    if (remaining.length === 0) {
      order.status = OrderStatus.COMPLETED;
      order.completedAt = new Date();
    } else if (order.status === OrderStatus.OVERDUE && !remaining.some((i) => i.status === InstallmentStatus.OVERDUE)) {
      order.status = OrderStatus.ACTIVE;
    }
    await manager.save(order);
  }

  private async saveCard(manager: EntityManager, customerId: string, verified: ChargeResult): Promise<string> {
    const auth = verified.authorization!;
    const existing = await manager.findOne(PaymentMethod, {
      where: { customerId, signature: auth.signature },
      withDeleted: true,
    });
    const hasDefault = await manager.exists(PaymentMethod, { where: { customerId, isDefault: true } });

    if (existing) {
      existing.authorizationCode = encryptSecret(auth.authorizationCode);
      existing.expMonth = auth.expMonth;
      existing.expYear = auth.expYear;
      existing.reusable = auth.reusable;
      existing.deletedAt = undefined;
      if (!hasDefault) existing.isDefault = true;
      await manager.save(existing);
      return existing.id;
    }

    const created = await manager.save(
      manager.create(PaymentMethod, {
        customerId,
        provider: this.provider.name,
        authorizationCode: encryptSecret(auth.authorizationCode),
        signature: auth.signature,
        brand: auth.brand,
        last4: auth.last4,
        expMonth: auth.expMonth,
        expYear: auth.expYear,
        bank: auth.bank,
        reusable: auth.reusable,
        isDefault: !hasDefault,
      }),
    );
    return created.id;
  }

  private async decrementStock(manager: EntityManager, orderId: string) {
    const items = await manager.find(OrderItem, { where: { orderId } });
    for (const item of items) {
      await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => `GREATEST(stock - ${Math.trunc(item.quantity)}, 0)` })
        .where("id = :id", { id: item.productId })
        .execute();
    }
  }

  private async merchantName(manager: EntityManager, merchantId: string) {
    const row = await manager.query(`SELECT name FROM merchants WHERE id = $1`, [merchantId]);
    return (row[0]?.name as string | undefined) ?? undefined;
  }

  private async afterSettle({ outcome, payment, order }: SettleResult) {
    if (outcome === "paid") {
      const remaining = await this.dataSource
        .getRepository(Installment)
        .count({ where: { orderId: order.id, status: In(UNPAID) } });
      const completed = order.status === OrderStatus.COMPLETED;
      await this.dispatcher.notify(payment.customerId, {
        type: completed ? NotificationType.ORDER_COMPLETED : NotificationType.PAYMENT_RECEIVED,
        title: completed ? "Paid in full" : "Payment received",
        body: completed
          ? `Order ${order.reference} is fully paid. Nice work.`
          : `We received ${formatNaira(payment.amountKobo)}. ${remaining} payment${remaining === 1 ? "" : "s"} left.`,
        data: { orderId: order.id, reference: payment.reference },
      });
      const customer = await this.dataSource.getRepository(User).findOne({ where: { id: payment.customerId } });
      if (customer) {
        await this.email.sendPaymentReceipt(customer.email, {
          amountKobo: payment.amountKobo,
          orderReference: order.reference,
          remaining,
        });
      }
    } else if (outcome === "failed" && payment.channel === PaymentChannel.CARD_ON_FILE) {
      await this.dispatcher.notify(payment.customerId, {
        type: NotificationType.PAYMENT_FAILED,
        title: "Payment didn't go through",
        body: `We couldn't charge your card ${formatNaira(payment.amountKobo)} for order ${order.reference}. Tap to pay now.`,
        data: { orderId: order.id, reference: payment.reference },
      });
    }
  }
}
