import { Injectable } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import {
  BNPL_PLANS,
  CheckoutDTO,
  CheckoutResponse,
  InstallmentStatus,
  MerchantStatus,
  OrderStatus,
  buildInstallmentSchedule,
  formatNaira,
  percentOfKobo,
} from "@tranche/shared";
import { Installment, Merchant, Order, OrderItem, Product, User } from "@/database/entities";
import { BadRequestError, ConflictError, InsufficientCreditError, NotFoundError } from "@/common/errors";
import { randomCode } from "@/common/crypto";
import { todayIso } from "@/common/helpers/dates";
import { InstallmentRepository } from "@/repository/installment.repository";
import { OrderRepository } from "@/repository/order.repository";
import { SettingsService } from "@/core/settings.service";
import { CollectionService } from "@/core/billing/collection.service";
import { fullName, toOrderDetailView } from "@/core/billing/presenters";

export interface CreditCheckInput {
  creditLimitKobo: number;
  outstandingKobo: number;
  totalKobo: number;
  firstInstallmentKobo: number;
}

/**
 * Only the financed part (total minus what is paid today) counts against the shopper's limit,
 * alongside what they already owe on live orders.
 */
export const creditCheck = ({
  creditLimitKobo,
  outstandingKobo,
  totalKobo,
  firstInstallmentKobo,
}: CreditCheckInput) => {
  const financedKobo = totalKobo - firstInstallmentKobo;
  const availableKobo = Math.max(0, creditLimitKobo - outstandingKobo);
  return { ok: financedKobo <= availableKobo, financedKobo, availableKobo };
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrderRepository,
    private readonly installments: InstallmentRepository,
    private readonly settings: SettingsService,
    private readonly collection: CollectionService,
  ) {}

  async checkout(customer: User, dto: CheckoutDTO): Promise<CheckoutResponse> {
    const settings = await this.settings.get();
    if (!settings.enabledPlans.includes(dto.planCode)) throw new BadRequestError("That plan isn't available right now");

    const quantities = new Map<string, number>();
    for (const item of dto.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);

    const products = await this.dataSource.getRepository(Product).find({ where: { id: In([...quantities.keys()]) } });
    if (products.length !== quantities.size) throw new NotFoundError("One or more products are no longer available");

    const merchantIds = new Set(products.map((p) => p.merchantId));
    if (merchantIds.size !== 1) throw new BadRequestError("Check out items from one store at a time");
    const merchant = await this.dataSource.getRepository(Merchant).findOne({ where: { id: products[0].merchantId } });
    if (!merchant || merchant.status !== MerchantStatus.ACTIVE)
      throw new ConflictError("This store isn't accepting orders");

    for (const product of products) {
      const qty = quantities.get(product.id)!;
      if (!product.isActive) throw new ConflictError(`${product.name} is no longer available`);
      if (product.stock < qty) throw new ConflictError(`Only ${product.stock} of ${product.name} left`);
    }

    const totalKobo = products.reduce((t, p) => t + p.priceKobo * quantities.get(p.id)!, 0);
    const schedule = buildInstallmentSchedule(totalKobo, dto.planCode, todayIso());
    const check = creditCheck({
      creditLimitKobo: customer.creditLimitKobo,
      outstandingKobo: await this.installments.outstandingForCustomer(customer.id),
      totalKobo,
      firstInstallmentKobo: schedule[0].amountKobo,
    });
    if (!check.ok) {
      throw new InsufficientCreditError(
        `This purchase needs ${formatNaira(check.financedKobo)} of credit; you have ${formatNaira(check.availableKobo)} available.`,
        { availableKobo: check.availableKobo, requiredKobo: check.financedKobo },
      );
    }

    const feeKobo = percentOfKobo(totalKobo, merchant.feeBps ?? settings.merchantFeeBps);

    const order = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(Order, {
          reference: `TR-${randomCode(6)}`,
          customerId: customer.id,
          merchantId: merchant.id,
          planCode: dto.planCode,
          totalKobo,
          feeKobo,
          installmentCount: BNPL_PLANS[dto.planCode].installmentCount,
          status: OrderStatus.PENDING_PAYMENT,
        }),
      );
      await manager.save(
        products.map((p) =>
          manager.create(OrderItem, {
            orderId: created.id,
            productId: p.id,
            name: p.name,
            imageUrl: p.imageUrl ?? null,
            unitPriceKobo: p.priceKobo,
            quantity: quantities.get(p.id)!,
          }),
        ),
      );
      await manager.save(
        schedule.map((s) =>
          manager.create(Installment, {
            orderId: created.id,
            customerId: customer.id,
            merchantId: merchant.id,
            sequence: s.sequence,
            amountKobo: s.amountKobo,
            dueDate: s.dueDate,
            status: InstallmentStatus.PENDING,
          }),
        ),
      );
      return created;
    });

    const first = await this.dataSource
      .getRepository(Installment)
      .findOneOrFail({ where: { orderId: order.id, sequence: 1 } });
    const payment = await this.collection.collectInstallment(first.id, {
      channel: dto.paymentMethodId ? "card" : "checkout",
      paymentMethodId: dto.paymentMethodId,
      initiatedBy: "customer",
    });

    const fresh = await this.orders.findOneOrFail({ where: { id: order.id } });
    const children = await this.orders.loadChildren([order.id]);
    return {
      order: toOrderDetailView(fresh, children, { customer: fullName(customer), merchant: merchant.name }),
      payment,
    };
  }
}
