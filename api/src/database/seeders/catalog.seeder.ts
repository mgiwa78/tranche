import { faker } from "@faker-js/faker";
import { MerchantStatus, ProductCategory, UserRole, toKobo } from "@tranche/shared";
import { Merchant, Product, User } from "@/database/entities";
import { slugify } from "@/modules/global/services/auth.service";
import { DEMO_PASSWORD, SeedContext, Seeder, upsertUser } from "./essential.seeder";

interface StoreSeed {
  name: string;
  ownerEmail: string;
  status: MerchantStatus;
  feeBps: number | null;
  products: [name: string, naira: number, category: ProductCategory, description: string][];
}

export const STORES: StoreSeed[] = [
  {
    name: "Lagos Gadget Hub",
    ownerEmail: "merchant@tranche.ng",
    status: MerchantStatus.ACTIVE,
    feeBps: null,
    products: [
      ["Pixel 9 Pro 256GB", 1_180_000, ProductCategory.ELECTRONICS, "Unlocked, 2 year warranty, includes 45W charger."],
      ['MacBook Air M3 13"', 1_650_000, ProductCategory.ELECTRONICS, "8-core CPU, 16GB unified memory, 512GB SSD."],
      [
        "Sony WH-1000XM5",
        420_000,
        ProductCategory.ELECTRONICS,
        "Industry-leading noise cancellation, 30 hour battery.",
      ],
      [
        'Samsung 55" Crystal UHD TV',
        690_000,
        ProductCategory.ELECTRONICS,
        "4K smart TV with Tizen and AirSlim design.",
      ],
      ["iPad 10th Gen 64GB", 540_000, ProductCategory.ELECTRONICS, "10.9-inch Liquid Retina display, Wi-Fi."],
      [
        "Anker 20,000mAh Power Bank",
        38_500,
        ProductCategory.ELECTRONICS,
        "22.5W fast charging for phones and tablets.",
      ],
      ["PlayStation 5 Slim", 820_000, ProductCategory.ELECTRONICS, "Disc edition with one DualSense controller."],
      ["Oraimo FreePods 4", 32_000, ProductCategory.ELECTRONICS, "ANC earbuds with 35 hour playback."],
    ],
  },
  {
    name: "Adire & Co",
    ownerEmail: "adire@tranche.ng",
    status: MerchantStatus.ACTIVE,
    feeBps: 500,
    products: [
      ["Hand-dyed Adire Kaftan", 85_000, ProductCategory.FASHION, "Indigo adire on cotton, made in Abeokuta."],
      ["Aso-oke Wedding Set", 260_000, ProductCategory.FASHION, "Gele, ipele and iro, custom colours."],
      ["Leather Weekender Bag", 120_000, ProductCategory.FASHION, "Full-grain leather, brass hardware."],
      ["Ankara Two-piece", 55_000, ProductCategory.FASHION, "Tailored top and trousers in bold wax print."],
      ["Handwoven Sandals", 28_000, ProductCategory.FASHION, "Leather and raffia, made in Kano."],
    ],
  },
  {
    name: "Naija Home Living",
    ownerEmail: "home@tranche.ng",
    status: MerchantStatus.ACTIVE,
    feeBps: 400,
    products: [
      ["Three-seater Fabric Sofa", 780_000, ProductCategory.HOME, "Kiln-dried hardwood frame, stain-resistant fabric."],
      [
        "Inverter + 2 Batteries (3.5kVA)",
        1_450_000,
        ProductCategory.HOME,
        "Pure sine wave, installation included in Lagos.",
      ],
      ["Midea 1.5HP Split AC", 465_000, ProductCategory.HOME, "Inverter compressor, 40% energy saving."],
      ["Queen Orthopaedic Mattress", 310_000, ProductCategory.HOME, "Medium-firm, 10 year guarantee."],
      ['Standing Fan (18")', 54_000, ProductCategory.HOME, "Remote control, 3 speeds."],
      ["Non-stick Cookware Set", 72_000, ProductCategory.HOME, "10 pieces, induction compatible."],
    ],
  },
  {
    name: "Glow Lab Beauty",
    ownerEmail: "glow@tranche.ng",
    status: MerchantStatus.ACTIVE,
    feeBps: null,
    products: [
      ["Dyson Airwrap Complete", 890_000, ProductCategory.BEAUTY, "Multi-styler for curling, shaping and drying."],
      ["Skincare Starter Kit", 45_000, ProductCategory.BEAUTY, "Cleanser, toner, serum and SPF 50."],
      ["Signature Perfume 100ml", 98_000, ProductCategory.BEAUTY, "Oud and vanilla, long lasting."],
    ],
  },
  {
    name: "Pending Fitness Store",
    ownerEmail: "fitness@tranche.ng",
    status: MerchantStatus.PENDING,
    feeBps: null,
    products: [["Adjustable Dumbbells 24kg", 185_000, ProductCategory.SPORTS, "Quick-select weights, compact stand."]],
  },
];

/** Merchants, their owner logins and catalog. */
export class CatalogSeeder implements Seeder {
  async run({ dataSource, log }: SeedContext) {
    const merchants = dataSource.getRepository(Merchant);
    const products = dataSource.getRepository(Product);

    for (const store of STORES) {
      const slug = slugify(store.name);
      let merchant = await merchants.findOne({ where: { slug } });
      if (!merchant) {
        merchant = await merchants.save(
          merchants.create({
            name: store.name,
            slug,
            status: store.status,
            feeBps: store.feeBps,
            supportEmail: store.ownerEmail,
            settlementBankCode: "058",
            settlementAccountNumber: faker.string.numeric(10),
            settlementAccountName: store.name.toUpperCase(),
          }),
        );
      }
      const [firstName, ...rest] = faker.person.fullName().split(" ");
      const owner = await upsertUser(
        dataSource,
        {
          email: store.ownerEmail,
          firstName,
          lastName: rest.join(" ") || "Owner",
          role: UserRole.MERCHANT,
          merchantId: merchant.id,
        },
        DEMO_PASSWORD,
      );
      await merchants.update(merchant.id, { ownerUserId: owner.id });

      for (const [name, naira, category, description] of store.products) {
        if (await products.exists({ where: { merchantId: merchant.id, name } })) continue;
        await products.save(
          products.create({
            merchantId: merchant.id,
            name,
            description,
            priceKobo: toKobo(naira),
            category,
            imageUrl: `https://picsum.photos/seed/${slugify(name)}/800/800`,
            stock: faker.number.int({ min: 40, max: 120 }),
            isActive: true,
          }),
        );
      }
    }
    log(`${STORES.length} merchants, ${STORES.reduce((t, s) => t + s.products.length, 0)} products`);
  }
}

export const merchantOwners = (dataSource: SeedContext["dataSource"]) =>
  dataSource.getRepository(User).find({ where: { role: UserRole.MERCHANT } });
