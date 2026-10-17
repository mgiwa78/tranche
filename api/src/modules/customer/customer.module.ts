import { Module } from "@nestjs/common";
import { CatalogController } from "./controllers/catalog.controller";
import { OrderController } from "./controllers/order.controller";
import { PaymentController } from "./controllers/payment.controller";
import { CatalogService } from "./services/catalog.service";
import { CheckoutService } from "./services/checkout.service";
import { CustomerOrderService } from "./services/customer-order.service";
import { MaintenanceGuard } from "./maintenance.guard";

/** Shopper routes used by the mobile app: `/customer/*`. */
@Module({
  controllers: [CatalogController, OrderController, PaymentController],
  providers: [CatalogService, CheckoutService, CustomerOrderService, MaintenanceGuard],
})
export class CustomerModule {}
