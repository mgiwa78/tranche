import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public, RawResponse } from "@/common/decorators";
import { Config } from "@/config";

/**
 * Paystack's `callback_url` must be https, so checkouts return here and are bounced into the
 * app (`tranche://checkout/callback?reference=...`), where the auth session picks them up.
 * Nothing is settled here: the app's verify call and the webhook do that.
 */
@Controller("payments")
export class PaymentReturnController {
  @Public()
  @RawResponse()
  @Get("return")
  redirect(
    @Query("reference") reference: string | undefined,
    @Query("trxref") trxref: string | undefined,
    @Res() res: Response,
  ) {
    const ref = String(reference ?? trxref ?? "")
      .replace(/[^A-Za-z0-9_\-.]/g, "")
      .slice(0, 100);
    const target = Config.paystack.appReturnUrl;
    const separator = target.includes("?") ? "&" : "?";
    res.redirect(
      302,
      ref ? `${target}${separator}reference=${encodeURIComponent(ref)}&trxref=${encodeURIComponent(ref)}` : target,
    );
  }
}
