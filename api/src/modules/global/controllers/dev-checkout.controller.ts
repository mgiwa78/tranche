import { Controller, Get, Inject, NotFoundException, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { formatNaira } from "@tranche/shared";
import { Public, RawResponse } from "@/common/decorators";
import { PAYMENT_PROVIDER, PaymentProvider } from "@/core/payments/payment-provider.interface";
import { FakePaymentProvider } from "@/core/payments/fake.provider";
import { CollectionService } from "@/core/billing/collection.service";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Local stand-in for Paystack's hosted checkout, active only with the fake provider (no
 * PAYSTACK_SECRET_KEY). Approve or decline, then it redirects to the app's callback deep link
 * exactly as Paystack would.
 */
@Controller("dev/checkout")
export class DevCheckoutController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly collection: CollectionService,
  ) {}

  private fake(): FakePaymentProvider {
    if (!(this.provider instanceof FakePaymentProvider)) throw new NotFoundException();
    return this.provider;
  }

  @Public()
  @RawResponse()
  @Get(":reference")
  page(@Param("reference") reference: string, @Res() res: Response) {
    const tx = this.fake().transactions.get(reference);
    if (!tx) throw new NotFoundException();
    const ref = escape(reference);
    res.type("html")
      .send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test checkout</title><style>
body{font-family:system-ui,sans-serif;background:#0A1B3D;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}
main{background:#fff;color:#0D0D0D;border-radius:20px;padding:28px;width:min(360px,90vw)}
h1{font-size:18px;margin:0 0 4px}p{color:#555;margin:0 0 20px}strong{font-size:32px;display:block;margin-bottom:20px}
button{width:100%;padding:14px;border-radius:999px;border:0;font-size:16px;font-weight:600;margin-top:8px;cursor:pointer}
.pay{background:#0D0D0D;color:#fff}.fail{background:#f1f1f1;color:#b42318}</style></head>
<body><main><h1>Tranche test checkout</h1><p>No real card is charged.</p><strong>${escape(formatNaira(tx.amountKobo))}</strong>
<form method="post" action="${ref}/approve"><button class="pay">Pay with test card 4081</button></form>
<form method="post" action="${ref}/decline"><button class="fail">Decline</button></form></main></body></html>`);
  }

  @Public()
  @RawResponse()
  @Post(":reference/:decision")
  async decide(@Param("reference") reference: string, @Param("decision") decision: string, @Res() res: Response) {
    const tx = this.fake().complete(reference, decision === "approve");
    if (!tx) throw new NotFoundException();
    await this.collection.settle(reference);
    const callback = tx.callbackUrl ?? "tranche://checkout/callback";
    const separator = callback.includes("?") ? "&" : "?";
    res.redirect(
      302,
      `${callback}${separator}reference=${encodeURIComponent(reference)}&trxref=${encodeURIComponent(reference)}`,
    );
  }
}
