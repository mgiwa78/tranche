import { Body, Controller, Get, Patch } from "@nestjs/common";
import { UpdateMerchantProfileDTO, UserRole, updateMerchantProfileSchema } from "@tranche/shared";
import { CurrentMerchantId, Roles } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import { MerchantProfileService } from "../services/merchant-profile.service";

@Controller("merchant/profile")
@Roles(UserRole.MERCHANT)
export class ProfileController {
  constructor(private readonly profile: MerchantProfileService) {}

  @Get()
  get(@CurrentMerchantId() merchantId: string) {
    return this.profile.get(merchantId);
  }

  @Patch()
  update(
    @CurrentMerchantId() merchantId: string,
    @Body(zod(updateMerchantProfileSchema)) dto: UpdateMerchantProfileDTO,
  ) {
    return this.profile.update(merchantId, dto);
  }
}
