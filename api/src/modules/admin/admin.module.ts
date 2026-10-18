import { Module } from "@nestjs/common";
import {
  AdminCustomerController,
  AdminDashboardController,
  AdminLedgerController,
  AdminMerchantController,
  AdminOrderController,
  AdminSystemController,
} from "./controllers/admin.controllers";
import { AdminDashboardService } from "./services/admin-dashboard.service";
import { AdminAccountService } from "./services/admin-account.service";
import { AdminOrderService } from "./services/admin-order.service";

@Module({
  controllers: [
    AdminDashboardController,
    AdminMerchantController,
    AdminCustomerController,
    AdminOrderController,
    AdminLedgerController,
    AdminSystemController,
  ],
  providers: [AdminDashboardService, AdminAccountService, AdminOrderService],
})
export class AdminModule {}
