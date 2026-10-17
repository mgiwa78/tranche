import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ListProductsQueryDTO, UserRole, idParamSchema, listProductsQuerySchema } from "@tranche/shared";
import { Roles } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import { MaintenanceGuard } from "../maintenance.guard";
import { CatalogService } from "../services/catalog.service";

@Controller("customer")
@Roles(UserRole.CUSTOMER)
@UseGuards(MaintenanceGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("products")
  products(@Query(zod(listProductsQuerySchema)) query: ListProductsQueryDTO) {
    return this.catalog.list(query);
  }

  @Get("products/:id")
  product(@Param(zod(idParamSchema)) { id }: { id: string }) {
    return this.catalog.get(id);
  }

  @Get("stores")
  stores() {
    return this.catalog.stores();
  }
}
