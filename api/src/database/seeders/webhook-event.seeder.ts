import { DataSource } from "typeorm";
import { faker } from "@faker-js/faker";
import { PaymentChannel, PaymentProviderName, PaymentStatus, PayoutStatus, WebhookEventStatus } from "@tranche/shared";
import { Payment, Payout, WebhookEvent } from "@/database/entities";

/** The Paystack events the api would have received for the seeded payments and payouts. */
export class WebhookEventSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(WebhookEvent);
    const events: Partial<WebhookEvent>[] = [];
    const event = (name: string, reference: string | null, data: Record<string, unknown>, extra: Partial<WebhookEvent> = {}) =>
      events.push({
        provider: PaymentProviderName.PAYSTACK,
        event: name,
        reference,
        dedupeKey: `${PaymentProviderName.PAYSTACK}:${name}:${reference ?? data.id}`,
        status: WebhookEventStatus.PROCESSED,
        attempts: 1,
        payload: { event: name, data: { reference, ...data } },
        ...extra,
      });

    const payments = await dataSource.getRepository(Payment).find({ where: { status: PaymentStatus.SUCCESS } });
    for (const p of payments) {
      // Card-on-file charges are settled by the charge response; Paystack still notifies.
      const at = p.paidAt ?? p.createdAt;
      event(
        "charge.success",
        p.reference,
        { id: Number(p.providerTransactionId ?? faker.string.numeric(9)), amount: p.amountKobo, status: "success", channel: "card" },
        { createdAt: new Date(at.getTime() + 4_000), processedAt: new Date(at.getTime() + 6_000) },
      );
      if (p.channel === PaymentChannel.CHECKOUT && faker.number.float() < 0.05) {
        // Paystack sometimes notifies before its verify endpoint agrees: first attempt failed, retry processed.
        events[events.length - 1].attempts = 2;
      }
    }

    for (const payout of await dataSource.getRepository(Payout).find({ where: { status: PayoutStatus.PAID } })) {
      const at = payout.processedAt ?? payout.createdAt;
      event(
        "transfer.success",
        payout.reference,
        { transfer_code: payout.transferCode, amount: payout.amountKobo },
        { createdAt: at, processedAt: new Date(at.getTime() + 3_000) },
      );
    }

    for (let i = 0; i < 4; i++) {
      const at = faker.date.recent({ days: 30 });
      event(
        faker.helpers.arrayElement(["charge.dispute.create", "subscription.create", "customeridentification.success"]),
        null,
        { id: faker.number.int({ min: 1e6, max: 9e6 }) },
        { status: WebhookEventStatus.IGNORED, createdAt: at, processedAt: at },
      );
    }
    event(
      "charge.success",
      `TRP_unknown${faker.string.alphanumeric(8)}`,
      { id: faker.number.int({ min: 1e6, max: 9e6 }), amount: 500_000 },
      {
        status: WebhookEventStatus.FAILED,
        attempts: 3,
        error: "Provider has not confirmed this charge yet",
        createdAt: faker.date.recent({ days: 2 }),
      },
    );

    await repo.save(repo.create(events), { chunk: 200 });
  }
}
