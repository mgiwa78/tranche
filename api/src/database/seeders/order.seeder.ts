import { DataSource, EntityManager } from "typeorm";
import { faker } from "@faker-js/faker";
import {
  BNPL_PLANS,
  InstallmentStatus,
  LedgerTransactionKind,
  OrderStatus,
  PaymentChannel,
  PaymentProviderName,
  PaymentStatus,
  PlanCode,
  PlatformSettingsDTO,
  addDays,
  buildInstallmentSchedule,
  daysBetween,
  parseIsoDate,
  percentOfKobo,
  toIsoDate,
} from "@tranche/shared";
import {
  Installment,
  LedgerTransaction,
  Merchant,
  Order,
  OrderItem,
  Payment,
  PaymentMethod,
  PlatformSetting,
  Product,
  User,
} from "@/database/entities";
import { createReference, randomCode } from "@/common/crypto";
import { todayIso } from "@/common/helpers/dates";
import { LedgerService } from "@/core/ledger/ledger.service";
import { installmentCollectedPosting, lateFeePosting, orderFinancedPosting } from "@/core/ledger/postings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/core/settings.service";
import { DEFAULT_AFTER_DAYS } from "@/core/billing/delinquency.service";
import { fullName } from "@/core/billing/presenters";
import { seededCustomers } from "./user.seeder";
import { seededMerchants } from "./merchant.seeder";
import { PLATFORM_SETTINGS_KEY } from "./platform-setting.seeder";

export const seededSettings = async (dataSource: DataSource): Promise<PlatformSettingsDTO> => {
  const row = await dataSource.getRepository(PlatformSetting).findOne({ where: { key: PLATFORM_SETTINGS_KEY } });
  return { ...DEFAULT_PLATFORM_SETTINGS, ...((row?.value as Partial<PlatformSettingsDTO>) ?? {}) };
};

/** A time on a calendar day, so backdated rows look like real activity rather than midnight. */
const onDay = (iso: string, hour = faker.number.int({ min: 8, max: 20 })) => {
  const d = parseIsoDate(iso);
  d.setUTCHours(hour, faker.number.int({ min: 0, max: 59 }), faker.number.int({ min: 0, max: 59 }));
  return d;
};

interface Plan {
  customer: User;
  card: PaymentMethod | null;
  merchant: Merchant;
  products: Product[];
  planCode: PlanCode;
  daysAgo: number;
  /** Chance each later installment is paid on time; the first miss stops all later payments. */
  reliability: number;
  abandoned: boolean;
}

/**
 * Orders with their items, installments, payments and ledger postings, backdated up to five
 * months. Statuses follow the same rules the jobs apply (overdue after the due date, a late fee
 * after the grace period, default after 60 days), and every posting goes through LedgerService,
 * so the books balance exactly as if the orders had been placed through the api.
 */
export class OrderSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const settings = await seededSettings(dataSource);
    const ledger = new LedgerService(dataSource);
    const today = todayIso();
    const merchants = await seededMerchants(dataSource);
    const products = await dataSource.getRepository(Product).find({ where: { isActive: true } });
    const cards = await dataSource.getRepository(PaymentMethod).find({ where: { isDefault: true } });

    for (const customer of await seededCustomers(dataSource)) {
      const demo = customer.email === "customer@tranche.ng";
      const count = demo ? 4 : faker.number.int({ min: 1, max: 3 });
      for (let n = 0; n < count; n++) {
        const merchant = faker.helpers.arrayElement(merchants);
        const plan: Plan = {
          customer,
          card: cards.find((c) => c.customerId === customer.id) ?? null,
          merchant,
          products: faker.helpers.arrayElements(
            products.filter((p) => p.merchantId === merchant.id),
            { min: 1, max: 2 },
          ),
          planCode: faker.helpers.enumValue(PlanCode),
          // The demo shopper always has one plan that started this week.
          daysAgo: demo && n === 0 ? 3 : faker.number.int({ min: 0, max: 150 }),
          reliability: faker.number.float() < 0.18 ? 0.4 : 0.97,
          abandoned: !demo && faker.number.float() < 0.05,
        };
        if (plan.products.length === 0) continue;
        await dataSource.transaction((manager) => this.createOrder(manager, ledger, settings, today, plan));
      }
    }
  }

  private async createOrder(
    manager: EntityManager,
    ledger: LedgerService,
    settings: PlatformSettingsDTO,
    today: string,
    p: Plan,
  ) {
    const startIso = toIsoDate(addDays(parseIsoDate(today), -p.daysAgo));
    const createdAt = onDay(startIso);
    const totalKobo = p.products.reduce((t, product) => t + product.priceKobo, 0);
    const feeKobo = percentOfKobo(totalKobo, p.merchant.feeBps ?? settings.merchantFeeBps);
    const schedule = buildInstallmentSchedule(totalKobo, p.planCode, startIso);

    const order = await manager.save(
      manager.create(Order, {
        reference: `TR-${randomCode(6)}`,
        customerId: p.customer.id,
        merchantId: p.merchant.id,
        planCode: p.planCode,
        totalKobo,
        feeKobo,
        installmentCount: BNPL_PLANS[p.planCode].installmentCount,
        status: OrderStatus.PENDING_PAYMENT,
        createdAt,
      }),
    );
    await manager.save(
      p.products.map((product) =>
        manager.create(OrderItem, {
          orderId: order.id,
          productId: product.id,
          name: product.name,
          imageUrl: product.imageUrl ?? null,
          unitPriceKobo: product.priceKobo,
          quantity: 1,
          createdAt,
        }),
      ),
    );

    // Checkout opened but never paid: pending today, cancelled by the nightly sweep if older.
    if (p.abandoned) {
      const stale = p.daysAgo >= 1;
      await manager.update(Order, order.id, {
        status: stale ? OrderStatus.CANCELLED : OrderStatus.PENDING_PAYMENT,
        cancelledAt: stale ? addDays(createdAt, 1) : null,
      });
      await manager.save(
        schedule.map((s) =>
          manager.create(Installment, {
            orderId: order.id,
            customerId: p.customer.id,
            merchantId: p.merchant.id,
            sequence: s.sequence,
            amountKobo: s.amountKobo,
            dueDate: s.dueDate,
            status: stale ? InstallmentStatus.CANCELLED : InstallmentStatus.PENDING,
            createdAt,
          }),
        ),
      );
      await manager.save(
        manager.create(Payment, {
          reference: createReference("TRP"),
          orderId: order.id,
          customerId: p.customer.id,
          merchantId: p.merchant.id,
          provider: PaymentProviderName.PAYSTACK,
          channel: PaymentChannel.CHECKOUT,
          amountKobo: schedule[0].amountKobo,
          status: stale ? PaymentStatus.ABANDONED : PaymentStatus.PENDING,
          failureReason: stale ? "Checkout expired" : null,
          createdAt,
        }),
      );
      return;
    }

    const customerName = fullName(p.customer) ?? undefined;
    const posted: { reference: string; kind: LedgerTransactionKind; at: Date }[] = [];
    await ledger.post(
      manager,
      orderFinancedPosting({
        orderId: order.id,
        orderReference: order.reference,
        customerId: p.customer.id,
        customerName,
        merchantId: p.merchant.id,
        merchantName: p.merchant.name,
        totalKobo,
        feeKobo,
      }),
    );
    posted.push({ reference: order.id, kind: LedgerTransactionKind.ORDER_FINANCED, at: createdAt });

    let stillPaying = true;
    let lastPaidAt: Date | null = null;
    const statuses: InstallmentStatus[] = [];

    for (const s of schedule) {
      const first = s.sequence === 1;
      const due = s.dueDate <= today;
      const pays = first || (stillPaying && due && faker.number.float() < p.reliability);
      if (!first && due && !pays) stillPaying = false;

      const daysLate = daysBetween(s.dueDate, today);
      const overdue = !pays && daysLate > 0;
      const lateFeeKobo = overdue && daysLate > settings.graceDays ? settings.lateFeeKobo : 0;
      const paidAt = pays ? (first ? createdAt : onDay(s.dueDate, 9)) : null;
      const status = pays ? InstallmentStatus.PAID : overdue ? InstallmentStatus.OVERDUE : InstallmentStatus.PENDING;
      statuses.push(status);

      const installment = await manager.save(
        manager.create(Installment, {
          orderId: order.id,
          customerId: p.customer.id,
          merchantId: p.merchant.id,
          sequence: s.sequence,
          amountKobo: s.amountKobo,
          lateFeeKobo,
          dueDate: s.dueDate,
          status,
          paidAt,
          attemptCount: pays ? (first ? 0 : 1) : overdue ? Math.min(daysLate, settings.maxChargeAttempts) : 0,
          lastAttemptAt: pays && !first ? paidAt : overdue ? onDay(s.dueDate, 10) : null,
          createdAt,
        }),
      );

      if (pays) {
        lastPaidAt = paidAt;
        const payment = await manager.save(
          manager.create(Payment, {
            reference: createReference("TRP"),
            orderId: order.id,
            installmentId: installment.id,
            customerId: p.customer.id,
            merchantId: p.merchant.id,
            provider: PaymentProviderName.PAYSTACK,
            channel: first ? PaymentChannel.CHECKOUT : PaymentChannel.CARD_ON_FILE,
            amountKobo: s.amountKobo,
            status: PaymentStatus.SUCCESS,
            paymentMethodId: p.card?.id ?? null,
            providerTransactionId: faker.string.numeric(10),
            cardLast4: p.card?.last4 ?? null,
            paidAt,
            createdAt: paidAt!,
          }),
        );
        await ledger.post(
          manager,
          installmentCollectedPosting({
            paymentId: payment.id,
            paymentReference: payment.reference,
            orderId: order.id,
            installmentId: installment.id,
            customerId: p.customer.id,
            customerName,
            amountKobo: s.amountKobo,
          }),
        );
        posted.push({ reference: payment.id, kind: LedgerTransactionKind.INSTALLMENT_COLLECTED, at: paidAt! });
      } else if (overdue && p.card) {
        // The auto-charge tried the saved card on the due date and was declined.
        await manager.save(
          manager.create(Payment, {
            reference: createReference("TRP"),
            orderId: order.id,
            installmentId: installment.id,
            customerId: p.customer.id,
            merchantId: p.merchant.id,
            provider: PaymentProviderName.PAYSTACK,
            channel: PaymentChannel.CARD_ON_FILE,
            amountKobo: s.amountKobo,
            status: PaymentStatus.FAILED,
            paymentMethodId: p.card.id,
            cardLast4: p.card.last4,
            failureReason: faker.helpers.arrayElement(["Insufficient funds", "Declined by bank", "Card expired"]),
            createdAt: onDay(s.dueDate, 10),
          }),
        );
      }

      if (lateFeeKobo > 0) {
        await ledger.post(
          manager,
          lateFeePosting({
            installmentId: installment.id,
            orderId: order.id,
            customerId: p.customer.id,
            customerName,
            amountKobo: lateFeeKobo,
          }),
        );
        posted.push({
          reference: installment.id,
          kind: LedgerTransactionKind.LATE_FEE,
          at: onDay(toIsoDate(addDays(parseIsoDate(s.dueDate), settings.graceDays + 1)), 1),
        });
      }
    }

    const oldestOverdue = schedule.find((_, i) => statuses[i] === InstallmentStatus.OVERDUE);
    const status = statuses.every((st) => st === InstallmentStatus.PAID)
      ? OrderStatus.COMPLETED
      : oldestOverdue && daysBetween(oldestOverdue.dueDate, today) >= DEFAULT_AFTER_DAYS
        ? OrderStatus.DEFAULTED
        : oldestOverdue
          ? OrderStatus.OVERDUE
          : OrderStatus.ACTIVE;
    await manager.update(Order, order.id, {
      status,
      activatedAt: createdAt,
      completedAt: status === OrderStatus.COMPLETED ? lastPaidAt : null,
    });

    // Journal dates follow the backdated activity (entries themselves are append-only).
    for (const t of posted) {
      await manager.update(LedgerTransaction, { kind: t.kind, reference: t.reference }, { createdAt: t.at });
    }
  }
}
