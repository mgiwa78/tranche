import { DataSource } from "typeorm";
import { PlatformSetting } from "@/database/entities";
import { DEFAULT_PLATFORM_SETTINGS } from "@/core/settings.service";

export const PLATFORM_SETTINGS_KEY = "platform";

/** Creates the platform settings row if missing; never overwrites a value an admin changed. */
export class PlatformSettingSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(PlatformSetting);
    const existing = await repo.findOne({ where: { key: PLATFORM_SETTINGS_KEY } });
    if (existing) {
      // New settings added in code get their default; anything already stored is kept.
      const merged = { ...DEFAULT_PLATFORM_SETTINGS, ...((existing.value as object) ?? {}) };
      if (JSON.stringify(merged) !== JSON.stringify(existing.value)) await repo.update(existing.id, { value: merged });
      return;
    }
    await repo.save(repo.create({ key: PLATFORM_SETTINGS_KEY, value: DEFAULT_PLATFORM_SETTINGS }));
  }
}
