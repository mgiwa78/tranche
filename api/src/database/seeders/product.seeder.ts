import { DataSource } from "typeorm";
import { faker } from "@faker-js/faker";
import { toKobo } from "@tranche/shared";
import { Merchant, Product } from "@/database/entities";
import { slugify } from "@/modules/global/services/auth.service";
import { STORES } from "./merchant.seeder";

export class ProductSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Product);
    const merchants = new Map(
      (await dataSource.getRepository(Merchant).find()).map((m) => [m.slug, m]),
    );
    const products: Partial<Product>[] = [];

    for (const store of STORES) {
      const merchant = merchants.get(slugify(store.name));
      if (!merchant) continue;
      for (const [name, naira, category, description] of store.products) {
        products.push({
          merchantId: merchant.id,
          name,
          description,
          priceKobo: toKobo(naira),
          category,
          imageUrl: `https://picsum.photos/seed/${slugify(name)}/800/800`,
          stock: faker.number.int({ min: 40, max: 120 }),
          isActive: faker.helpers.maybe(() => false, { probability: 0.05 }) ?? true,
          createdAt: faker.date.between({ from: merchant.createdAt, to: new Date() }),
        });
      }
    }
    await repo.save(repo.create(products));
  }
}
