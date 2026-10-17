export * from "./base.entity";
export * from "./soft-delete-base.entity";
export * from "./user.entity";
export * from "./merchant.entity";
export * from "./product.entity";
export * from "./order.entity";
export * from "./order-item.entity";
export * from "./installment.entity";
export * from "./payment.entity";
export * from "./payment-method.entity";
export * from "./payout.entity";
export * from "./ledger-account.entity";
export * from "./ledger-transaction.entity";
export * from "./ledger-entry.entity";
export * from "./webhook-event.entity";
export * from "./notification.entity";
export * from "./device-token.entity";
export * from "./audit-log.entity";
export * from "./platform-setting.entity";

import { User } from "./user.entity";
import { Merchant } from "./merchant.entity";
import { Product } from "./product.entity";
import { Order } from "./order.entity";
import { OrderItem } from "./order-item.entity";
import { Installment } from "./installment.entity";
import { Payment } from "./payment.entity";
import { PaymentMethod } from "./payment-method.entity";
import { Payout } from "./payout.entity";
import { LedgerAccount } from "./ledger-account.entity";
import { LedgerTransaction } from "./ledger-transaction.entity";
import { LedgerEntry } from "./ledger-entry.entity";
import { WebhookEvent } from "./webhook-event.entity";
import { Notification } from "./notification.entity";
import { DeviceToken } from "./device-token.entity";
import { AuditLog } from "./audit-log.entity";
import { PlatformSetting } from "./platform-setting.entity";

export const ENTITIES = [
  User,
  Merchant,
  Product,
  Order,
  OrderItem,
  Installment,
  Payment,
  PaymentMethod,
  Payout,
  LedgerAccount,
  LedgerTransaction,
  LedgerEntry,
  WebhookEvent,
  Notification,
  DeviceToken,
  AuditLog,
  PlatformSetting,
];
