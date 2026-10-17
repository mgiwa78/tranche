import { Injectable } from "@nestjs/common";
import {
  CreateProductDTO,
  ListProductsQueryDTO,
  PaginatedResponse,
  ProductView,
  UpdateProductDTO,
} from "@tranche/shared";
import { User } from "@/database/entities";
import { NotFoundError } from "@/common/errors";
import { getFilterOptions } from "@/common/types";
import { mapPaginated } from "@/common/helpers/list-filter";
import { assertMerchantActive } from "@/common/guards/roles.guard";
import { ProductRepository } from "@/repository/product.repository";
import { MerchantRepository } from "@/repository/merchant.repository";
import { toProductView } from "@/core/billing/presenters";

@Injectable()
export class MerchantProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly merchants: MerchantRepository,
  ) {}

  async list(merchantId: string, query: ListProductsQueryDTO): Promise<PaginatedResponse<ProductView>> {
    const { merchantId: _ignored, ...rest } = query;
    const page = await this.products.listForMerchant(merchantId, getFilterOptions(rest));
    return mapPaginated(page, (p) => toProductView(p));
  }

  async get(merchantId: string, id: string): Promise<ProductView> {
    return toProductView(await this.owned(merchantId, id));
  }

  async create(merchantId: string, _user: User, dto: CreateProductDTO): Promise<ProductView> {
    await this.assertWritable(merchantId);
    const product = await this.products.save(
      this.products.create({ ...dto, imageUrl: dto.imageUrl ?? null, merchantId }),
    );
    return toProductView(product);
  }

  async update(merchantId: string, id: string, dto: UpdateProductDTO): Promise<ProductView> {
    await this.assertWritable(merchantId);
    const product = await this.owned(merchantId, id);
    Object.assign(product, dto);
    return toProductView(await this.products.save(product));
  }

  async remove(merchantId: string, id: string) {
    await this.assertWritable(merchantId);
    await this.owned(merchantId, id);
    await this.products.delete(id);
    return { deleted: true };
  }

  private async owned(merchantId: string, id: string) {
    const product = await this.products.findById(id);
    if (!product || product.merchantId !== merchantId) throw new NotFoundError("Product not found");
    return product;
  }

  private async assertWritable(merchantId: string) {
    const merchant = await this.merchants.findById(merchantId);
    if (!merchant) throw new NotFoundError("Merchant not found");
    assertMerchantActive(merchant.status);
  }
}
