import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  AdminRole,
  AnalyticsQueryDTO,
  ListCustomersQueryDTO,
  ListLedgerAccountsQueryDTO,
  ListLedgerTransactionsQueryDTO,
  ListMerchantsQueryDTO,
  ListOrdersQueryDTO,
  ListPayoutsQueryDTO,
  ListWebhookEventsQueryDTO,
  PaginationQueryDTO,
  ReviewPayoutDTO,
  UpdateCustomerDTO,
  UpdateMerchantFeeDTO,
  UpdateMerchantStatusDTO,
  UpdatePlatformSettingsDTO,
  UserRole,
  analyticsQuerySchema,
  idParamSchema,
  listCustomersQuerySchema,
  listLedgerAccountsQuerySchema,
  listLedgerTransactionsQuerySchema,
  listMerchantsQuerySchema,
  listOrdersQuerySchema,
  listPayoutsQuerySchema,
  listWebhookEventsQuerySchema,
  paginationQuerySchema,
  reviewPayoutSchema,
  updateCustomerSchema,
  updateMerchantFeeSchema,
  updateMerchantStatusSchema,
  updatePlatformSettingsSchema,
} from "@tranche/shared";
import { CurrentUser, MinAdminRole, Roles } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import { getFilterOptions } from "@/common/types";
import { buildMeta, mapPaginated } from "@/common/helpers/list-filter";
import { AuditLogger } from "@/common/monitoring/audit";
import type { User } from "@/database/entities";
import { WebhookEventRepository } from "@/repository/notification.repository";
import { LedgerService } from "@/core/ledger/ledger.service";
import { PayoutService } from "@/core/billing/payout.service";
import { WebhookService } from "@/core/billing/webhook.service";
import { SettingsService } from "@/core/settings.service";
import { toWebhookEventView } from "@/core/billing/presenters";
import { AdminDashboardService } from "../services/admin-dashboard.service";
import { AdminAccountService } from "../services/admin-account.service";
import { AdminOrderService } from "../services/admin-order.service";

type IdParam = { id: string };

/** Every admin route needs `role = admin`; mutations raise the bar with @MinAdminRole. */
@Controller("admin")
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get("dashboard")
  get(@Query(zod(analyticsQuerySchema)) query: AnalyticsQueryDTO) {
    return this.dashboard.get(query.days);
  }
}

@Controller("admin/merchants")
@Roles(UserRole.ADMIN)
export class AdminMerchantController {
  constructor(private readonly accounts: AdminAccountService) {}

  @Get()
  list(@Query(zod(listMerchantsQuerySchema)) query: ListMerchantsQueryDTO) {
    return this.accounts.listMerchants(query);
  }

  @Get(":id")
  get(@Param(zod(idParamSchema)) { id }: IdParam) {
    return this.accounts.getMerchant(id);
  }

  @Patch(":id/status")
  @MinAdminRole(AdminRole.ADMIN)
  status(
    @CurrentUser() admin: User,
    @Param(zod(idParamSchema)) { id }: IdParam,
    @Body(zod(updateMerchantStatusSchema)) dto: UpdateMerchantStatusDTO,
  ) {
    return this.accounts.updateMerchantStatus(id, admin.id, dto);
  }

  @Patch(":id/fee")
  @MinAdminRole(AdminRole.SUPER_ADMIN)
  fee(
    @CurrentUser() admin: User,
    @Param(zod(idParamSchema)) { id }: IdParam,
    @Body(zod(updateMerchantFeeSchema)) dto: UpdateMerchantFeeDTO,
  ) {
    return this.accounts.updateMerchantFee(id, admin.id, dto);
  }
}

@Controller("admin/customers")
@Roles(UserRole.ADMIN)
export class AdminCustomerController {
  constructor(private readonly accounts: AdminAccountService) {}

  @Get()
  list(@Query(zod(listCustomersQuerySchema)) query: ListCustomersQueryDTO) {
    return this.accounts.listCustomers(query);
  }

  @Get(":id")
  get(@Param(zod(idParamSchema)) { id }: IdParam) {
    return this.accounts.getCustomer(id);
  }

  @Patch(":id")
  @MinAdminRole(AdminRole.ADMIN)
  update(
    @CurrentUser() admin: User,
    @Param(zod(idParamSchema)) { id }: IdParam,
    @Body(zod(updateCustomerSchema)) dto: UpdateCustomerDTO,
  ) {
    return this.accounts.updateCustomer(id, admin.id, dto);
  }
}

@Controller("admin")
@Roles(UserRole.ADMIN)
export class AdminOrderController {
  constructor(
    private readonly orders: AdminOrderService,
    private readonly payouts: PayoutService,
  ) {}

  @Get("orders")
  list(@Query(zod(listOrdersQuerySchema)) query: ListOrdersQueryDTO) {
    return this.orders.list(query);
  }

  @Get("orders/:id")
  get(@Param(zod(idParamSchema)) { id }: IdParam) {
    return this.orders.get(id);
  }

  @Post("orders/:id/cancel")
  @HttpCode(200)
  @MinAdminRole(AdminRole.ADMIN)
  cancel(@CurrentUser() admin: User, @Param(zod(idParamSchema)) { id }: IdParam) {
    return this.orders.cancel(id, admin.id);
  }

  @Get("payouts")
  listPayouts(@Query(zod(listPayoutsQuerySchema)) query: ListPayoutsQueryDTO) {
    return this.orders.listPayouts(query);
  }

  @Post("payouts/:id/review")
  @HttpCode(200)
  @MinAdminRole(AdminRole.ADMIN)
  review(
    @CurrentUser() admin: User,
    @Param(zod(idParamSchema)) { id }: IdParam,
    @Body(zod(reviewPayoutSchema)) dto: ReviewPayoutDTO,
  ) {
    return this.payouts.review(id, admin.id, dto);
  }
}

@Controller("admin/ledger")
@Roles(UserRole.ADMIN)
export class AdminLedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get("accounts")
  accounts(@Query(zod(listLedgerAccountsQuerySchema)) query: ListLedgerAccountsQueryDTO) {
    return this.ledger.listAccounts(query);
  }

  @Get("accounts/:id")
  account(@Param(zod(idParamSchema)) { id }: IdParam) {
    return this.ledger.getAccount(id);
  }

  @Get("transactions")
  transactions(@Query(zod(listLedgerTransactionsQuerySchema)) query: ListLedgerTransactionsQueryDTO) {
    return this.ledger.listTransactions(query);
  }

  @Get("trial-balance")
  trialBalance() {
    return this.ledger.trialBalance();
  }
}

@Controller("admin")
@Roles(UserRole.ADMIN)
export class AdminSystemController {
  constructor(
    private readonly settings: SettingsService,
    private readonly webhooks: WebhookService,
    private readonly webhookEvents: WebhookEventRepository,
  ) {}

  @Get("settings")
  getSettings() {
    return this.settings.get();
  }

  @Patch("settings")
  @MinAdminRole(AdminRole.SUPER_ADMIN)
  updateSettings(@CurrentUser() admin: User, @Body(zod(updatePlatformSettingsSchema)) dto: UpdatePlatformSettingsDTO) {
    return this.settings.update(dto, admin.id);
  }

  @Get("webhooks")
  async listWebhooks(@Query(zod(listWebhookEventsQuerySchema)) query: ListWebhookEventsQueryDTO) {
    return mapPaginated(await this.webhookEvents.list(getFilterOptions(query)), toWebhookEventView);
  }

  @Post("webhooks/:id/replay")
  @HttpCode(200)
  @MinAdminRole(AdminRole.ADMIN)
  replay(@Param(zod(idParamSchema)) { id }: IdParam) {
    return this.webhooks.replay(id);
  }

  @Get("audit-logs")
  async auditLogs(@Query(zod(paginationQuerySchema)) query: PaginationQueryDTO) {
    const logger = AuditLogger.getInstance();
    await logger.flushLogs();
    const rows = await logger.queryAuditLogs({
      action: query.search,
      limit: query.limit + 1,
      offset: (query.page - 1) * query.limit,
    });
    const hasMore = rows.length > query.limit;
    const data = rows.slice(0, query.limit).map((r) => ({
      id: r.id,
      userId: r.userId ?? null,
      action: r.action,
      resourceType: r.resourceType,
      resourceId: r.resourceId ?? null,
      metadata: r.metadata ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
    const total = (query.page - 1) * query.limit + data.length + (hasMore ? 1 : 0);
    return { data, meta: { ...buildMeta(total, query.page, query.limit), hasMore } };
  }
}
