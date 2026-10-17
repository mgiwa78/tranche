import { CanActivate, Injectable } from "@nestjs/common";
import { MaintenanceModeError } from "@/common/errors";
import { SettingsService } from "@/core/settings.service";

/** The reference's maintenance-mode middleware: shopper routes close while admins keep working. */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly settings: SettingsService) {}

  async canActivate(): Promise<boolean> {
    if ((await this.settings.get()).maintenanceMode) throw new MaintenanceModeError();
    return true;
  }
}
