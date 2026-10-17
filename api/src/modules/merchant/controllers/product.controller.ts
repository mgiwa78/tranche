import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  CreateProductDTO,
  ListProductsQueryDTO,
  UpdateProductDTO,
  UserRole,
  createProductSchema,
  idParamSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from "@tranche/shared";
import { CurrentMerchantId, CurrentUser, ResponseMessage, Roles } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import type { User } from "@/database/entities";
import { MerchantProductService } from "../services/merchant-product.service";

@Controller("merchant/products")
@Roles(UserRole.MERCHANT)
export class ProductController {
  constructor(private readonly products: MerchantProductService) {}

  @Get()
  list(@CurrentMerchantId() merchantId: string, @Query(zod(listProductsQuerySchema)) query: ListProductsQueryDTO) {
    return this.products.list(merchantId, query);
  }

  @Get(":id")
  get(@CurrentMerchantId() merchantId: string, @Param(zod(idParamSchema)) { id }: { id: string }) {
    return this.products.get(merchantId, id);
  }

  @Post()
  @ResponseMessage("Product created")
  create(
    @CurrentMerchantId() merchantId: string,
    @CurrentUser() user: User,
    @Body(zod(createProductSchema)) dto: CreateProductDTO,
  ) {
    return this.products.create(merchantId, user, dto);
  }

  @Patch(":id")
  update(
    @CurrentMerchantId() merchantId: string,
    @Param(zod(idParamSchema)) { id }: { id: string },
    @Body(zod(updateProductSchema)) dto: UpdateProductDTO,
  ) {
    return this.products.update(merchantId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentMerchantId() merchantId: string, @Param(zod(idParamSchema)) { id }: { id: string }) {
    return this.products.remove(merchantId, id);
  }
}
