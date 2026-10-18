import { Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "@/common/decorators";
import { WebhookService } from "@/core/billing/webhook.service";

/** Paystack posts here. Mounted before the general rate limiter and verified with HMAC-SHA512 over the raw body. */
@Controller("webhooks")
export class WebhookController {
  constructor(private readonly webhooks: WebhookService) {}

  @Public()
  @Post("paystack")
  @HttpCode(200)
  paystack(@Req() req: Request, @Headers("x-paystack-signature") signature?: string) {
    return this.webhooks.receive(req.rawBody, signature);
  }
}
