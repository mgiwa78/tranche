import { DataSource } from "typeorm";
import { faker } from "@faker-js/faker";
import { PaymentProviderName } from "@tranche/shared";
import { PaymentMethod } from "@/database/entities";
import { encryptSecret } from "@/common/crypto";
import { seededCustomers } from "./user.seeder";

const BRANDS = ["visa", "mastercard", "verve"] as const;
const BANKS = ["Guaranty Trust Bank", "Access Bank", "Zenith Bank", "First Bank of Nigeria", "Kuda Bank", "OPay"];

/** One saved card per shopper (two for a few), encrypted like the real ones. */
export class PaymentMethodSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(PaymentMethod);
    const cards: Partial<PaymentMethod>[] = [];

    for (const customer of await seededCustomers(dataSource)) {
      const count = faker.helpers.weightedArrayElement([
        { weight: 8, value: 1 },
        { weight: 2, value: 2 },
      ]);
      for (let i = 0; i < count; i++) {
        cards.push({
          customerId: customer.id,
          provider: PaymentProviderName.PAYSTACK,
          authorizationCode: encryptSecret(`AUTH_${faker.string.alphanumeric(10).toLowerCase()}`),
          signature: `SIG_${faker.string.alphanumeric(20)}`,
          brand: faker.helpers.arrayElement(BRANDS),
          last4: faker.string.numeric(4),
          expMonth: String(faker.number.int({ min: 1, max: 12 })).padStart(2, "0"),
          expYear: String(faker.number.int({ min: 2027, max: 2031 })),
          bank: faker.helpers.arrayElement(BANKS),
          reusable: true,
          isDefault: i === 0,
          createdAt: faker.date.between({ from: customer.createdAt, to: new Date() }),
        });
      }
    }
    await repo.save(repo.create(cards));
  }
}
