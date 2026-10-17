import { Injectable } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import {
  AccountStatus,
  AdminCustomerView,
  AdminMerchantView,
  ListCustomersQueryDTO,
  ListMerchantsQueryDTO,
  PaginatedResponse,
  UpdateCustomerDTO,
  UpdateMerchantFeeDTO,
  UpdateMerchantStatusDTO,
  UserRole,
} from "@tranche/shared";
import { User } from "@/database/entities";
import { NotFoundError } from "@/common/errors";
import { getFilterOptions } from "@/common/types";
import { recordAdminAction } from "@/common/monitoring/audit";
import { UserRepository } from "@/repository/user.repository";
import { MerchantRepository } from "@/repository/merchant.repository";
import { SettingsService } from "@/core/settings.service";
import { PayoutService } from "@/core/billing/payout.service";
import { fullName, toMerchantView } from "@/core/billing/presenters";

/** Merchants and customers, as seen by Tranche staff. */
@Injectable()
export class AdminAccountService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly users: UserRepository,
    private readonly merchants: MerchantRepository,
    private readonly settings: SettingsService,
    private readonly payouts: PayoutService,
  ) {}

  async listMerchants(query: ListMerchantsQueryDTO): Promise<PaginatedResponse<AdminMerchantView>> {
    const page = await this.merchants.listPaginated(getFilterOptions(query));
    const data = await this.decorateMerchants(page.data.map((m) => m.id));
    return { data: page.data.map((m) => data.get(m.id)!), meta: page.meta };
  }

  async getMerchant(id: string): Promise<AdminMerchantView> {
    const view = (await this.decorateMerchants([id])).get(id);
    if (!view) throw new NotFoundError("Merchant not found");
    return view;
  }

  async updateMerchantStatus(id: string, adminId: string, dto: UpdateMerchantStatusDTO) {
    const merchant = await this.merchants.findById(id);
    if (!merchant) throw new NotFoundError("Merchant not found");
    await this.merchants.update(id, { status: dto.status });
    recordAdminAction("merchant.status", adminId, "merchant", id, {
      from: merchant.status,
      to: dto.status,
      reason: dto.reason,
    });
    return this.getMerchant(id);
  }

  async updateMerchantFee(id: string, adminId: string, dto: UpdateMerchantFeeDTO) {
    if (!(await this.merchants.findById(id))) throw new NotFoundError("Merchant not found");
    await this.merchants.update(id, { feeBps: dto.feeBps });
    recordAdminAction("merchant.fee", adminId, "merchant", id, { feeBps: dto.feeBps });
    return this.getMerchant(id);
  }

  private async decorateMerchants(ids: string[]): Promise<Map<string, AdminMerchantView>> {
    if (ids.length === 0) return new Map();
    const { merchantFeeBps } = await this.settings.get();
    const merchants = await this.merchants.find({ where: { id: In(ids) } });
    const owners = await this.users.find({
      where: { id: In(merchants.map((m) => m.ownerUserId).filter(Boolean) as string[]) },
      select: ["id", "email"],
    });
    const stats: { merchant_id: string; orders: string; gmv: string }[] = await this.dataSource.query(
      `SELECT merchant_id, COUNT(*) AS orders, COALESCE(SUM(total_kobo) FILTER (WHERE activated_at IS NOT NULL), 0) AS gmv
         FROM orders WHERE merchant_id = ANY($1::uuid[]) GROUP BY merchant_id`,
      [ids],
    );
    const out = new Map<string, AdminMerchantView>();
    for (const m of merchants) {
      const s = stats.find((r) => r.merchant_id === m.id);
      out.set(m.id, {
        ...toMerchantView(m, merchantFeeBps),
        ownerEmail: owners.find((o) => o.id === m.ownerUserId)?.email ?? null,
        ordersCount: Number(s?.orders ?? 0),
        gmvKobo: Number(s?.gmv ?? 0),
        availableKobo: (await this.payouts.balance(m.id)).availableKobo,
      });
    }
    return out;
  }

  async listCustomers(query: ListCustomersQueryDTO): Promise<PaginatedResponse<AdminCustomerView>> {
    const page = await this.users.listPaginated(getFilterOptions(query), { role: UserRole.CUSTOMER });
    const stats = await this.customerStats(page.data.map((u) => u.id));
    return { data: page.data.map((u) => this.toCustomerView(u, stats)), meta: page.meta };
  }

  async getCustomer(id: string): Promise<AdminCustomerView> {
    const user = await this.users.findOne({ where: { id, role: UserRole.CUSTOMER } });
    if (!user) throw new NotFoundError("Customer not found");
    return this.toCustomerView(user, await this.customerStats([id]));
  }

  async updateCustomer(id: string, adminId: string, dto: UpdateCustomerDTO) {
    const user = await this.users.findOne({ where: { id, role: UserRole.CUSTOMER } });
    if (!user) throw new NotFoundError("Customer not found");
    await this.users.update(id, {
      ...(dto.creditLimitKobo !== undefined ? { creditLimitKobo: dto.creditLimitKobo } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      // Suspending signs the customer out everywhere.
      ...(dto.status === AccountStatus.SUSPENDED ? { sessionsRevokedAt: new Date() } : {}),
    });
    recordAdminAction("customer.update", adminId, "user", id, dto);
    return this.getCustomer(id);
  }

  private async customerStats(ids: string[]) {
    if (ids.length === 0) return new Map<string, { orders: number; outstanding: number }>();
    const rows: { customer_id: string; orders: string; outstanding: string }[] = await this.dataSource.query(
      `SELECT o.customer_id, COUNT(DISTINCT o.id) AS orders,
              COALESCE(SUM(i.amount_kobo + i.late_fee_kobo) FILTER (
                WHERE i.status IN ('pending','failed','overdue') AND o.status IN ('active','overdue')), 0) AS outstanding
         FROM orders o LEFT JOIN installments i ON i.order_id = o.id
        WHERE o.customer_id = ANY($1::uuid[])
        GROUP BY o.customer_id`,
      [ids],
    );
    return new Map(rows.map((r) => [r.customer_id, { orders: Number(r.orders), outstanding: Number(r.outstanding) }]));
  }

  private toCustomerView(u: User, stats: Map<string, { orders: number; outstanding: number }>): AdminCustomerView {
    return {
      id: u.id,
      email: u.email,
      name: fullName(u) ?? u.email,
      phone: u.phone ?? null,
      status: u.status,
      creditLimitKobo: u.creditLimitKobo,
      ordersCount: stats.get(u.id)?.orders ?? 0,
      outstandingKobo: stats.get(u.id)?.outstanding ?? 0,
      createdAt: u.createdAt.toISOString(),
    };
  }
}
