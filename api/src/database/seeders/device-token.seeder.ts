import { DataSource } from "typeorm";
import { faker } from "@faker-js/faker";
import { DevicePlatform } from "@tranche/shared";
import { DeviceToken } from "@/database/entities";
import { seededCustomers } from "./user.seeder";

export class DeviceTokenSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(DeviceToken);
    const tokens: Partial<DeviceToken>[] = [];

    for (const user of await seededCustomers(dataSource)) {
      if (faker.number.float() > 0.65) continue; // not everyone allows notifications
      tokens.push({
        userId: user.id,
        platform: faker.helpers.enumValue(DevicePlatform),
        token: `ExponentPushToken[${faker.string.alphanumeric(22)}]`,
        lastSeenAt: faker.date.recent({ days: 14 }),
      });
    }
    await repo.save(repo.create(tokens));
  }
}
