import { In, DataSource } from "typeorm";
import {
  InstallmentStatus,
  InstallmentView,
  MeView,
  MerchantView,
  NotificationView,
  OrderDetailView,
  OrderItemView,
  OrderView,
  PaymentMethodView,
  PaymentView,
  PayoutView,
  ProductView,
  WebhookEventView,
} from "@tranche/shared";
import {
  Installment,
  Merchant,
  Notification,
  Order,
  OrderItem,
  Payment,
  PaymentMethod,
  Payout,
  Product,
  User,
  WebhookEvent,
} from "@/database/entities";
import { toIso } from "@/common/helpers/dates";

export const fullName = (u?: Pick<User, "firstName" | "lastName"> | null) =>
  u ? `${u.firstName} ${u.lastName}`.trim() : null;

export const maskAccountNumber = (n?: string | null) => (n ? `******${n.slice(-4)}` : null);

export const toMeView = (user: User, merchant?: Merchant | null): MeView => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone ?? null,
  role: user.role,
  adminRole: user.adminRole ?? null,
  status: user.status,
  creditLimitKobo: user.creditLimitKobo,
  merchant: merchant ? { id: merchant.id, name: merchant.name, slug: merchant.slug, status: merchant.status } : null,
  createdAt: user.createdAt.toISOString(),
});

export const toMerchantView = (m: Merchant, defaultFeeBps: number): MerchantView => ({
  id: m.id,
  name: m.name,
  slug: m.slug,
  status: m.status,
  feeBps: m.feeBps ?? defaultFeeBps,
  supportEmail: m.supportEmail ?? null,
  settlementBankCode: m.settlementBankCode ?? null,
  settlementAccountNumber: maskAccountNumber(m.settlementAccountNumber),
  settlementAccountName: m.settlementAccountName ?? null,
  createdAt: m.createdAt.toISOString(),
});

export const toProductView = (p: Product, merchantName: string | null = null): ProductView => ({
  id: p.id,
  merchantId: p.merchantId,
  merchantName,
  name: p.name,
  description: p.description,
  priceKobo: p.priceKobo,
  imageUrl: p.imageUrl ?? null,
  category: p.category,
  stock: p.stock,
  isActive: p.isActive,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

export const toInstallmentView = (i: Installment): InstallmentView => ({
  id: i.id,
  orderId: i.orderId,
  sequence: i.sequence,
  amountKobo: i.amountKobo + i.lateFeeKobo,
  dueDate: i.dueDate,
  status: i.status,
  paidAt: toIso(i.paidAt),
  attemptCount: i.attemptCount,
});

export const toPaymentView = (p: Payment): PaymentView => ({
  id: p.id,
  reference: p.reference,
  orderId: p.orderId,
  installmentId: p.installmentId ?? null,
  amountKobo: p.amountKobo,
  status: p.status,
  channel: p.channel,
  provider: p.provider,
  cardLast4: p.cardLast4 ?? null,
  failureReason: p.failureReason ?? null,
  paidAt: toIso(p.paidAt),
  createdAt: p.createdAt.toISOString(),
});

export const toOrderItemView = (i: OrderItem): OrderItemView => ({
  id: i.id,
  productId: i.productId,
  name: i.name,
  imageUrl: i.imageUrl ?? null,
  unitPriceKobo: i.unitPriceKobo,
  quantity: i.quantity,
  lineTotalKobo: i.unitPriceKobo * i.quantity,
});

const owed = (i: Installment) => i.amountKobo + i.lateFeeKobo;
const UNPAID = new Set([InstallmentStatus.PENDING, InstallmentStatus.FAILED, InstallmentStatus.OVERDUE]);

/** Derives paid/outstanding/next-due from the installments: one definition for every audience. */
export const summarizeInstallments = (installments: Installment[]) => {
  const sorted = [...installments].sort((a, b) => a.sequence - b.sequence);
  const paid = sorted.filter((i) => i.status === InstallmentStatus.PAID);
  const unpaid = sorted.filter((i) => UNPAID.has(i.status));
  const next = unpaid[0] ?? null;
  return {
    paidKobo: paid.reduce((t, i) => t + owed(i), 0),
    outstandingKobo: unpaid.reduce((t, i) => t + owed(i), 0),
    overdueKobo: unpaid.filter((i) => i.status === InstallmentStatus.OVERDUE).reduce((t, i) => t + owed(i), 0),
    installmentsPaid: paid.length,
    next,
  };
};

export const toOrderView = (
  order: Order,
  installments: Installment[],
  names: { customer?: string | null; merchant?: string | null } = {},
): OrderView => {
  const s = summarizeInstallments(installments.filter((i) => i.orderId === order.id));
  return {
    id: order.id,
    reference: order.reference,
    customerId: order.customerId,
    customerName: names.customer ?? null,
    merchantId: order.merchantId,
    merchantName: names.merchant ?? null,
    planCode: order.planCode,
    totalKobo: order.totalKobo,
    feeKobo: order.feeKobo,
    paidKobo: s.paidKobo,
    outstandingKobo: s.outstandingKobo,
    status: order.status,
    installmentCount: order.installmentCount,
    installmentsPaid: s.installmentsPaid,
    nextDueDate: s.next?.dueDate ?? null,
    nextDueKobo: s.next ? owed(s.next) : null,
    createdAt: order.createdAt.toISOString(),
  };
};

export const toOrderDetailView = (
  order: Order,
  children: { installments: Installment[]; items: OrderItem[]; payments: Payment[] },
  names: { customer?: string | null; merchant?: string | null } = {},
): OrderDetailView => ({
  ...toOrderView(order, children.installments, names),
  items: children.items.filter((i) => i.orderId === order.id).map(toOrderItemView),
  installments: children.installments.filter((i) => i.orderId === order.id).map(toInstallmentView),
  payments: children.payments.filter((p) => p.orderId === order.id).map(toPaymentView),
});

export const toPaymentMethodView = (m: PaymentMethod): PaymentMethodView => ({
  id: m.id,
  brand: m.brand,
  last4: m.last4,
  expMonth: m.expMonth,
  expYear: m.expYear,
  bank: m.bank ?? null,
  isDefault: m.isDefault,
  createdAt: m.createdAt.toISOString(),
});

export const toPayoutView = (p: Payout, merchantName: string | null = null): PayoutView => ({
  id: p.id,
  merchantId: p.merchantId,
  merchantName,
  amountKobo: p.amountKobo,
  status: p.status,
  reference: p.reference,
  failureReason: p.failureReason ?? null,
  createdAt: p.createdAt.toISOString(),
  processedAt: toIso(p.processedAt),
});

export const toNotificationView = (n: Notification): NotificationView => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  data: n.data ?? null,
  readAt: toIso(n.readAt),
  createdAt: n.createdAt.toISOString(),
});

export const toWebhookEventView = (e: WebhookEvent): WebhookEventView => ({
  id: e.id,
  provider: e.provider,
  event: e.event,
  reference: e.reference ?? null,
  status: e.status,
  attempts: e.attempts,
  error: e.error ?? null,
  createdAt: e.createdAt.toISOString(),
  processedAt: toIso(e.processedAt),
});

/** Batch name lookups so list endpoints never N+1 (the reference joins in services too). */
export const loadNames = async (dataSource: DataSource, ids: { userIds?: string[]; merchantIds?: string[] }) => {
  const userIds = [...new Set(ids.userIds ?? [])];
  const merchantIds = [...new Set(ids.merchantIds ?? [])];
  const [users, merchants] = await Promise.all([
    userIds.length
      ? dataSource.getRepository(User).find({
          where: { id: In(userIds) },
          select: ["id", "firstName", "lastName", "email"],
          withDeleted: true,
        })
      : Promise.resolve([] as User[]),
    merchantIds.length
      ? dataSource
          .getRepository(Merchant)
          .find({ where: { id: In(merchantIds) }, select: ["id", "name"], withDeleted: true })
      : Promise.resolve([] as Merchant[]),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const merchantMap = new Map(merchants.map((m) => [m.id, m.name]));
  return {
    user: (id: string) => userMap.get(id) ?? null,
    userName: (id: string) => fullName(userMap.get(id)),
    merchantName: (id: string) => merchantMap.get(id) ?? null,
  };
};
