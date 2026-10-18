// Status is a colored dot plus plain text, not a filled pill.
const dotStyles = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  default: "bg-faint",
} as const;
const badgeStyles = dotStyles;

type BadgeStyleKey = keyof typeof badgeStyles;

interface BadgeOption {
  label: string;
  style: BadgeStyleKey;
}

const AccountStatusOptions: Record<string, BadgeOption> = {
  active: { label: "Active", style: "success" },
  suspended: { label: "Suspended", style: "danger" },
};

const MerchantStatusOptions: Record<string, BadgeOption> = {
  pending: { label: "Pending review", style: "warning" },
  active: { label: "Active", style: "success" },
  suspended: { label: "Suspended", style: "danger" },
};

const OrderStatusOptions: Record<string, BadgeOption> = {
  pending_payment: { label: "Awaiting payment", style: "default" },
  active: { label: "Active", style: "info" },
  overdue: { label: "Overdue", style: "warning" },
  completed: { label: "Paid off", style: "success" },
  defaulted: { label: "Defaulted", style: "danger" },
  cancelled: { label: "Cancelled", style: "default" },
  refunded: { label: "Refunded", style: "default" },
};

const InstallmentStatusOptions: Record<string, BadgeOption> = {
  pending: { label: "Upcoming", style: "default" },
  paid: { label: "Paid", style: "success" },
  failed: { label: "Failed", style: "danger" },
  overdue: { label: "Overdue", style: "warning" },
  cancelled: { label: "Cancelled", style: "default" },
};

const PaymentStatusOptions: Record<string, BadgeOption> = {
  pending: { label: "Pending", style: "default" },
  success: { label: "Succeeded", style: "success" },
  failed: { label: "Failed", style: "danger" },
  abandoned: { label: "Abandoned", style: "default" },
};

const PayoutStatusOptions: Record<string, BadgeOption> = {
  requested: { label: "Requested", style: "warning" },
  approved: { label: "Approved", style: "info" },
  processing: { label: "Processing", style: "info" },
  paid: { label: "Paid", style: "success" },
  failed: { label: "Failed", style: "danger" },
  rejected: { label: "Rejected", style: "default" },
};

const WebhookStatusOptions: Record<string, BadgeOption> = {
  received: { label: "Received", style: "default" },
  processed: { label: "Processed", style: "success" },
  ignored: { label: "Ignored", style: "default" },
  failed: { label: "Failed", style: "danger" },
};

const ActiveOptions: Record<string, BadgeOption> = {
  true: { label: "Listed", style: "success" },
  false: { label: "Hidden", style: "default" },
};

const AdminRoleNameOptions: Record<string, BadgeOption> = {
  support: { label: "Support", style: "default" },
  admin: { label: "Admin", style: "info" },
  super_admin: { label: "Super admin", style: "warning" },
};

export const OptionTypes = {
  ACCOUNT_STATUS: AccountStatusOptions,
  MERCHANT_STATUS: MerchantStatusOptions,
  ORDER_STATUS: OrderStatusOptions,
  INSTALLMENT_STATUS: InstallmentStatusOptions,
  PAYMENT_STATUS: PaymentStatusOptions,
  PAYOUT_STATUS: PayoutStatusOptions,
  WEBHOOK_STATUS: WebhookStatusOptions,
  PRODUCT_ACTIVE: ActiveOptions,
  ADMIN_ROLE_NAME: AdminRoleNameOptions,
} as const;

export type BadgeType = keyof typeof OptionTypes;

export interface BadgeProps {
  type?: BadgeType;
  variant?: BadgeStyleKey;
  children: string;
  className?: string;
}

/**
 * Pass the raw status
 * string as `children` under a domain `type`, and the component resolves
 * the human label + color from a lookup map — callers never hand-pick
 * colors per status.
 */
export function Badge({ type, variant = "default", children, className }: BadgeProps) {
  const key = children?.toString().toLowerCase().trim();
  const resolved = type ? OptionTypes[type][key] : undefined;
  const label = resolved?.label ?? children;
  const style = badgeStyles[resolved?.style ?? variant];

  return (
    <span className={["inline-flex items-center gap-2 text-sm text-ink", className].filter(Boolean).join(" ")}>
      <span aria-hidden="true" className={["h-1.5 w-1.5 rounded-full", style].join(" ")} />
      {label}
    </span>
  );
}
