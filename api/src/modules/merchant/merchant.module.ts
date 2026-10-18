import { Module } from "@nestjs/common";
import { ProductController } from "./controllers/product.controller";
import { MerchantOrderController } from "./controllers/order.controller";
import { PayoutController } from "./controllers/payout.controller";
import { ProfileController } from "./controllers/profile.controller";
import { MerchantProductService } from "./services/merchant-product.service";
import { MerchantOrderService } from "./services/merchant-order.service";
import { MerchantProfileService } from "./services/merchant-profile.service";

@Module({
  controllers: [ProductController, MerchantOrderController, PayoutController, ProfileController],
  providers: [MerchantProductService, MerchantOrderService, MerchantProfileService],
})
export class MerchantModule {}
