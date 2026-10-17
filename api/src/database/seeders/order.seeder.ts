import { faker } from "@faker-js/faker";
import { In, LessThanOrEqual } from "typeorm";
import { InstallmentStatus, MerchantStatus, PlanCode, UserRole, addDays, parseIsoDate } from "@tranche/shared";
import { Installment, Merchant, Product, User } from "@/database/entities";
import { todayIso } from "@/common/helpers/dates";
import { AppError } from "@/common/errors";
import { CheckoutService } from "@/modules/customer/services/checkout.service";
import { CollectionService } from "@/core/billing/collection.service";
import { DelinquencyService } from "@/core/billing/delinquency.service";
import { PayoutService } from "@/core/billing/payout.service";
import { SettingsService } from "@/core/settings.service";
import { PAYMENT_PROVIDER } from "@/core/payments/payment-provider.interface";
import { FakePaymentProvider } from "@/core/payments/fake.provider";
import { DEMO_PASSWORD, SeedContext, Seeder, upsertUser } from "./essential.seeder";

const CUSTOMERS = 24;

/**
 * Orders are created through the real checkout, collection and delinquency services (so the
 * ledger is exactly what production would write), then backdated to build a history.
 */
export class OrderSeeder implements Seeder {
  async run(ctx: SeedContext) {
    const { dataSource, app, log } = ctx;
    const provider = app.get(PAYMENT_PROVIDER);
    if (!(provider instanceof FakePaymentProvider)) throw new Error("Order seeding requires the fake payment provider");

    const { defaultCreditLimitKobo } = await app.get(SettingsService).get();
    const customers: User[] = [
      await upsertUser(
        dataSource,
        {
          email: "customer@tranche.ng",
          firstName: "Ada",
          lastName: "Okafor",
          phone: "+2348012345678",
          role: UserRole.CUSTOMER,
          creditLimitKobo: 3_000_000_00,
        },
        DEMO_PASSWORD,
      ),
    ];
    for (let i = 0; i < CUSTOMERS; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      customers.push(
        await upsertUser(
          dataSource,
          {
            email: faker.internet.email({ firstName, lastName, provider: "example.com" }).toLowerCase(),
            firstName,
            lastName,
            phone: `+23480${faker.string.numeric(8)}`,
            role: UserRole.CUSTOMER,
            creditLimitKobo: faker.helpers.arrayElement([defaultCreditLimitKobo, 1_000_000_00, 2_000_000_00]),
          },
          DEMO_PASSWORD,
        ),
      );
    }
    log(`${customers.length} customers`);

    const activeMerchants = await dataSource.getRepository(Merchant).find({ where: { status: MerchantStatus.ACTIVE } });
    const catalog = await dataSource
      .getRepository(Product)
      .find({ where: { merchantId: In(activeMerchants.map((m) => m.id)), isActive: true } });

    const checkout = app.get(CheckoutService);
    const collection = app.get(CollectionService);
    let created = 0;

    for (const customer of customers) {
      const orderCount = customer.email === "customer@tranche.ng" ? 4 : faker.number.int({ min: 1, max: 3 });
      for (let n = 0; n < orderCount; n++) {
        const merchant = faker.helpers.arrayElement(activeMerchants);
        const products = faker.helpers.arrayElements(
          catalog.filter((p) => p.merchantId === merchant.id),
          { min: 1, max: 2 },
        );
        const planCode = faker.helpers.arrayElement(Object.values(PlanCode));
        const daysAgo =
          n === 0 && customer.email === "customer@tranche.ng" ? 3 : faker.number.int({ min: 0, max: 150 });
        // Some shoppers stop paying; most pay on time.
        const payReliability = faker.number.float({ min: 0, max: 1 }) < 0.18 ? 0.4 : 0.97;

        try {
          const result = await checkout.checkout(customer, {
            items: products.map((p) => ({ productId: p.id, quantity: 1 })),
            planCode,
          });
          if (faker.number.float() < 0.05) continue; // abandoned checkout, stays pending
          provider.complete(result.payment.reference, true);
          await collection.settle(result.payment.reference);
          await this.backdate(ctx, result.order.id, daysAgo);
          await this.payDueInstallments(ctx, result.order.id, payReliability);
          created++;
        } catch (error) {
          if (error instanceof AppError && error.status < 500) continue; // credit limit, stock: skip
          throw error;
        }
      }
    }
    log(`${created} financed orders with payment history`);

    const sweep = await app.get(DelinquencyService).sweep();
    log(`delinquency: ${sweep.markedOverdue} overdue, ${sweep.lateFees} late fees, ${sweep.defaulted} defaulted`);

    await this.seedPayouts(ctx, activeMerchants);
  }

  /** Moves an order's whole timeline `days` into the past. */
  private async backdate({ dataSource }: SeedContext, orderId: string, days: number) {
    if (days === 0) return;
    const interval = `${days} days`;
    await dataSource.query(
      `UPDATE orders SET created_at = created_at - $2::interval, activated_at = activated_at - $2::interval WHERE id = $1`,
      [orderId, interval],
    );
    await dataSource.query(
      `UPDATE installments SET due_date = due_date - $2::int, created_at = created_at - $3::interval,
              paid_at = paid_at - $3::interval WHERE order_id = $1`,
      [orderId, days, interval],
    );
    await dataSource.query(
      `UPDATE payments SET created_at = created_at - $2::interval, paid_at = paid_at - $2::interval WHERE order_id = $1`,
      [orderId, interval],
    );
    await dataSource.query(
      `UPDATE ledger_transactions SET created_at = created_at - $2::interval
        WHERE reference = $1::text OR reference IN (SELECT id::text FROM payments WHERE order_id = $1::uuid)`,
      [orderId, interval],
    );
  }

  /** Charges the saved card for every installment that has come due, stopping at the first missed one. */
  private async payDueInstallments({ dataSource, app }: SeedContext, orderId: string, reliability: number) {
    const collection = app.get(CollectionService);
    const due = await dataSource.getRepository(Installment).find({
      where: { orderId, status: InstallmentStatus.PENDING, dueDate: LessThanOrEqual(todayIso()) },
      order: { sequence: "ASC" },
    });
    for (const installment of due) {
      if (faker.number.float() > reliability) return;
      const attempt = await collection.collectInstallment(installment.id, { channel: "card", initiatedBy: "system" });
      const paidAt = addDays(parseIsoDate(installment.dueDate), 0);
      paidAt.setUTCHours(9, faker.number.int({ min: 0, max: 59 }));
      await dataSource.query(`UPDATE payments SET created_at = $2, paid_at = $2 WHERE reference = $1`, [
        attempt.reference,
        paidAt,
      ]);
      await dataSource.query(`UPDATE installments SET paid_at = $2 WHERE id = $1`, [installment.id, paidAt]);
      await dataSource.query(
        `UPDATE ledger_transactions SET created_at = $2 WHERE reference IN (SELECT id::text FROM payments WHERE reference = $1)`,
        [attempt.reference, paidAt],
      );
    }
  }

  /** One paid payout per merchant (through the real approve -> transfer flow) and one waiting for review. */
  private async seedPayouts({ dataSource, app, log }: SeedContext, merchants: Merchant[]) {
    const payouts = app.get(PayoutService);
    const admin = await dataSource.getRepository(User).findOneOrFail({ where: { role: UserRole.ADMIN } });
    let count = 0;
    for (const merchant of merchants) {
      const balance = await payouts.balance(merchant.id);
      if (balance.availableKobo < 2_000_00) continue;
      const owner = merchant.ownerUserId!;
      const paid = await payouts.request(merchant.id, owner, Math.floor(balance.availableKobo * 0.6));
      await payouts.review(paid.id, admin.id, { decision: "approve" });
      const remaining = (await payouts.balance(merchant.id)).availableKobo;
      if (remaining >= 2_000_00) await payouts.request(merchant.id, owner, Math.floor(remaining * 0.5));
      count++;
    }
    log(`payouts for ${count} merchants`);
  }
}
