import { Module } from "@nestjs/common";
import { AuthController } from "./controllers/auth.controller";
import { SystemController } from "./controllers/system.controller";
import { NotificationController } from "./controllers/notification.controller";
import { WebhookController } from "./controllers/webhook.controller";
import { DevCheckoutController } from "./controllers/dev-checkout.controller";
import { PaymentReturnController } from "./controllers/payment-return.controller";
import { AuthService } from "./services/auth.service";

@Module({
  controllers: [
    AuthController,
    SystemController,
    NotificationController,
    WebhookController,
    DevCheckoutController,
    PaymentReturnController,
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class GlobalModule {}
