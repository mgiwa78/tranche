import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { AppConfigView, BNPL_PLANS } from "@tranche/shared";
import { Public, RawResponse } from "@/common/decorators";
import { HealthMonitor } from "@/common/monitoring/health";
import { Config } from "@/config";
import { SettingsService } from "@/core/settings.service";

@Controller()
export class SystemController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get()
  info() {
    return { service: Config.service.name, version: Config.service.version, docs: "/api/v1/health" };
  }

  /** Render's health check. 503 when Postgres or Redis is down so the deploy is held back. */
  @Public()
  @RawResponse()
  @Get("health")
  async health(@Res() res: Response) {
    const health = await HealthMonitor.getInstance().performHealthCheck();
    const body =
      Config.nodeEnv === "production"
        ? {
            status: health.status,
            uptime: health.uptime,
            checks: health.checks.map(({ name, status }) => ({ name, status })),
          }
        : health;
    res.status(health.status === "healthy" ? 200 : 503).json(body);
  }

  /** Public config the app reads at launch (plans, maintenance, minimum version). */
  @Public()
  @Get("app-config")
  async appConfig(): Promise<AppConfigView> {
    const s = await this.settings.get();
    return {
      plans: s.enabledPlans.map((code) => BNPL_PLANS[code]),
      maintenanceMode: s.maintenanceMode,
      minAppVersion: "1.0.0",
      reminderDaysBefore: s.reminderDaysBefore,
    };
  }
}
