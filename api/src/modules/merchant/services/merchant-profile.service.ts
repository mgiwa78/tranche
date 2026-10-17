import { Injectable } from "@nestjs/common";
import { MerchantView, UpdateMerchantProfileDTO } from "@tranche/shared";
import { NotFoundError } from "@/common/errors";
import { MerchantRepository } from "@/repository/merchant.repository";
import { SettingsService } from "@/core/settings.service";
import { toMerchantView } from "@/core/billing/presenters";

@Injectable()
export class MerchantProfileService {
  constructor(
    private readonly merchants: MerchantRepository,
    private readonly settings: SettingsService,
  ) {}

  async get(merchantId: string): Promise<MerchantView> {
    const merchant = await this.merchants.findById(merchantId);
    if (!merchant) throw new NotFoundError("Merchant not found");
    return toMerchantView(merchant, (await this.settings.get()).merchantFeeBps);
  }

  async update(merchantId: string, dto: UpdateMerchantProfileDTO): Promise<MerchantView> {
    const merchant = await this.merchants.findById(merchantId);
    if (!merchant) throw new NotFoundError("Merchant not found");
    const bankChanged =
      (dto.settlementAccountNumber !== undefined && dto.settlementAccountNumber !== merchant.settlementAccountNumber) ||
      (dto.settlementBankCode !== undefined && dto.settlementBankCode !== merchant.settlementBankCode);
    Object.assign(merchant, dto);
    // A new bank account needs a new Paystack transfer recipient.
    if (bankChanged) merchant.paystackRecipientCode = null;
    await this.merchants.save(merchant);
    return this.get(merchantId);
  }
}
