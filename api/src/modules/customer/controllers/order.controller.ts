import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  CheckoutDTO,
  ListOrdersQueryDTO,
  PayInstallmentDTO,
  UserRole,
  checkoutSchema,
  idParamSchema,
  listOrdersQuerySchema,
  payInstallmentSchema,
} from "@tranche/shared";
import { CurrentUser, Roles } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import type { User } from "@/database/entities";
import { MaintenanceGuard } from "../maintenance.guard";
import { CheckoutService } from "../services/checkout.service";
import { CustomerOrderService } from "../services/customer-order.service";

@Controller("customer")
@Roles(UserRole.CUSTOMER)
@UseGuards(MaintenanceGuard)
export class OrderController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly orders: CustomerOrderService,
  ) {}

  @Post("checkout")
  checkout(@CurrentUser() user: User, @Body(zod(checkoutSchema)) dto: CheckoutDTO) {
    return this.checkoutService.checkout(user, dto);
  }

  @Get("summary")
  summary(@CurrentUser() user: User) {
    return this.orders.summary(user);
  }

  @Get("orders")
  list(@CurrentUser() user: User, @Query(zod(listOrdersQuerySchema)) query: ListOrdersQueryDTO) {
    return this.orders.list(user, query);
  }

  @Get("orders/:id")
  get(@CurrentUser() user: User, @Param(zod(idParamSchema)) { id }: { id: string }) {
    return this.orders.get(user, id);
  }

  @Post("installments/:id/pay")
  @HttpCode(200)
  pay(
    @CurrentUser() user: User,
    @Param(zod(idParamSchema)) { id }: { id: string },
    @Body(zod(payInstallmentSchema)) dto: PayInstallmentDTO,
  ) {
    return this.orders.payInstallment(user, id, dto.paymentMethodId);
  }
}
