import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  AnalyticsQueryDTO,
  ListOrdersQueryDTO,
  PaginationQueryDTO,
  UserRole,
  analyticsQuerySchema,
  idParamSchema,
  listOrdersQuerySchema,
  paginationQuerySchema,
} from "@tranche/shared";
import { CurrentMerchantId, Roles } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import { MerchantOrderService } from "../services/merchant-order.service";

@Controller("merchant")
@Roles(UserRole.MERCHANT)
export class MerchantOrderController {
  constructor(private readonly orders: MerchantOrderService) {}

  @Get("dashboard")
  dashboard(@CurrentMerchantId() merchantId: string, @Query(zod(analyticsQuerySchema)) query: AnalyticsQueryDTO) {
    return this.orders.dashboard(merchantId, query.days);
  }

  @Get("orders")
  list(@CurrentMerchantId() merchantId: string, @Query(zod(listOrdersQuerySchema)) query: ListOrdersQueryDTO) {
    return this.orders.list(merchantId, query);
  }

  @Get("orders/:id")
  get(@CurrentMerchantId() merchantId: string, @Param(zod(idParamSchema)) { id }: { id: string }) {
    return this.orders.get(merchantId, id);
  }

  @Get("outstanding")
  outstanding(@CurrentMerchantId() merchantId: string, @Query(zod(paginationQuerySchema)) query: PaginationQueryDTO) {
    return this.orders.outstanding(merchantId, query);
  }
}
