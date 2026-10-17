import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  ListPayoutsQueryDTO,
  RequestPayoutDTO,
  UserRole,
  listPayoutsQuerySchema,
  requestPayoutSchema,
} from "@tranche/shared";
import { CurrentMerchantId, CurrentUser, ResponseMessage, Roles } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import { getFilterOptions } from "@/common/types";
import { mapPaginated } from "@/common/helpers/list-filter";
import type { User } from "@/database/entities";
import { PayoutRepository } from "@/repository/payout.repository";
import { PayoutService } from "@/core/billing/payout.service";
import { toPayoutView } from "@/core/billing/presenters";

@Controller("merchant")
@Roles(UserRole.MERCHANT)
export class PayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly payouts: PayoutRepository,
  ) {}

  @Get("balance")
  balance(@CurrentMerchantId() merchantId: string) {
    return this.payoutService.balance(merchantId);
  }

  @Get("payouts")
  async list(@CurrentMerchantId() merchantId: string, @Query(zod(listPayoutsQuerySchema)) query: ListPayoutsQueryDTO) {
    const { merchantId: _m, ...rest } = query;
    return mapPaginated(await this.payouts.list(getFilterOptions(rest), { merchantId }), (p) => toPayoutView(p));
  }

  @Post("payouts")
  @ResponseMessage("Payout requested. We'll review it shortly.")
  request(
    @CurrentMerchantId() merchantId: string,
    @CurrentUser() user: User,
    @Body(zod(requestPayoutSchema)) dto: RequestPayoutDTO,
  ) {
    return this.payoutService.request(merchantId, user.id, dto.amountKobo);
  }
}
