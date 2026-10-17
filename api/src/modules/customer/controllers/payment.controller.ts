import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import {
  ListPaymentsQueryDTO,
  UserRole,
  idParamSchema,
  listPaymentsQuerySchema,
  paymentReferenceParamSchema,
} from "@tranche/shared";
import { CurrentUser, Roles } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import type { User } from "@/database/entities";
import { MaintenanceGuard } from "../maintenance.guard";
import { CustomerOrderService } from "../services/customer-order.service";

@Controller("customer")
@Roles(UserRole.CUSTOMER)
@UseGuards(MaintenanceGuard)
export class PaymentController {
  constructor(private readonly orders: CustomerOrderService) {}

  @Get("payments")
  list(@CurrentUser() user: User, @Query(zod(listPaymentsQuerySchema)) query: ListPaymentsQueryDTO) {
    return this.orders.listPayments(user, query);
  }

  @Get("payments/verify/:reference")
  verify(@CurrentUser() user: User, @Param(zod(paymentReferenceParamSchema)) { reference }: { reference: string }) {
    return this.orders.verify(user, reference);
  }

  @Get("payment-methods")
  paymentMethods(@CurrentUser() user: User) {
    return this.orders.listPaymentMethods(user);
  }

  @Patch("payment-methods/:id/default")
  setDefault(@CurrentUser() user: User, @Param(zod(idParamSchema)) { id }: { id: string }) {
    return this.orders.setDefaultPaymentMethod(user, id);
  }

  @Delete("payment-methods/:id")
  remove(@CurrentUser() user: User, @Param(zod(idParamSchema)) { id }: { id: string }) {
    return this.orders.removePaymentMethod(user, id);
  }
}
