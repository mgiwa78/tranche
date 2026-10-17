import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ListProductsQueryDTO, MerchantStatus, PaginatedResponse, ProductView } from "@tranche/shared";
import { Merchant } from "@/database/entities";
import { NotFoundError } from "@/common/errors";
import { getFilterOptions } from "@/common/types";
import { mapPaginated } from "@/common/helpers/list-filter";
import { ProductRepository } from "@/repository/product.repository";
import { loadNames, toProductView } from "@/core/billing/presenters";

@Injectable()
export class CatalogService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly products: ProductRepository,
  ) {}

  async list(query: ListProductsQueryDTO): Promise<PaginatedResponse<ProductView>> {
    const { isActive: _ignored, ...rest } = query;
    const page = await this.products.listCatalog(getFilterOptions(rest));
    const names = await loadNames(this.dataSource, { merchantIds: page.data.map((p) => p.merchantId) });
    return mapPaginated(page, (p) => toProductView(p, names.merchantName(p.merchantId)));
  }

  async get(id: string): Promise<ProductView> {
    const product = await this.products.findById(id);
    if (!product || !product.isActive) throw new NotFoundError("Product not found");
    const merchant = await this.dataSource.getRepository(Merchant).findOne({ where: { id: product.merchantId } });
    if (!merchant || merchant.status !== MerchantStatus.ACTIVE) throw new NotFoundError("Product not found");
    return toProductView(product, merchant.name);
  }

  async stores() {
    const merchants = await this.dataSource.getRepository(Merchant).find({
      where: { status: MerchantStatus.ACTIVE },
      order: { name: "ASC" },
      select: ["id", "name", "slug"],
    });
    return merchants.map((m) => ({ id: m.id, name: m.name, slug: m.slug }));
  }
}
