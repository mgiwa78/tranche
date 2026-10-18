import { Injectable } from "@nestjs/common";
import { PlanCode, PlatformSettingsDTO, platformSettingsSchema, UpdatePlatformSettingsDTO } from "@tranche/shared";
import { RedisClient } from "@/common/redis/client";
import { PlatformSettingRepository } from "@/repository/notification.repository";
import { recordAdminAction } from "@/common/monitoring/audit";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsDTO = {
  merchantFeeBps: 450,
  lateFeeKobo: 1_000_00,
  graceDays: 3,
  reminderDaysBefore: 3,
  defaultCreditLimitKobo: 500_000_00,
  maxChargeAttempts: 4,
  enabledPlans: [PlanCode.PAY_IN_4, PlanCode.MONTHLY_3, PlanCode.MONTHLY_6],
  maintenanceMode: false,
};

const SETTINGS_KEY = "platform";
const CACHE_KEY = "settings:platform";

/**
 * One JSON row in `platform_settings`, cached in Redis for 60s. Unknown or invalid stored values
 * fall back to defaults field by field.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly repository: PlatformSettingRepository,
    private readonly redis: RedisClient,
  ) {}

  async get(): Promise<PlatformSettingsDTO> {
    const cached = await this.redis.getJSON<PlatformSettingsDTO>(CACHE_KEY).catch(() => null);
    if (cached) return cached;

    const row = await this.repository.findOne({ where: { key: SETTINGS_KEY } });
    const merged = { ...DEFAULT_PLATFORM_SETTINGS, ...((row?.value as Partial<PlatformSettingsDTO>) ?? {}) };
    const parsed = platformSettingsSchema.safeParse(merged);
    const settings = parsed.success ? parsed.data : DEFAULT_PLATFORM_SETTINGS;
    await this.redis.setJSON(CACHE_KEY, settings, 60).catch(() => undefined);
    return settings;
  }

  async update(patch: UpdatePlatformSettingsDTO, adminUserId?: string): Promise<PlatformSettingsDTO> {
    const next = platformSettingsSchema.parse({ ...(await this.get()), ...patch });
    const existing = await this.repository.findOne({ where: { key: SETTINGS_KEY } });
    if (existing) {
      existing.value = next;
      existing.updatedByAdminUserId = adminUserId ?? null;
      await this.repository.save(existing);
    } else {
      await this.repository.save(
        this.repository.create({ key: SETTINGS_KEY, value: next, updatedByAdminUserId: adminUserId ?? null }),
      );
    }
    await this.redis.del(CACHE_KEY).catch(() => undefined);
    if (adminUserId) recordAdminAction("settings.update", adminUserId, "platform_settings", SETTINGS_KEY, patch);
    return next;
  }
}
