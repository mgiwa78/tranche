"use client";

import { MerchantStatus, UserRole } from "@tranche/shared";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { NavSection } from "@/components/layout/Sidebar";
import { Badge } from "@/components/ui/Badge";
import { useAppSelector } from "@/store/hooks";
import { selectMerchant } from "@/store/selectors/authSelectors";

const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/merchant/dashboard", label: "Dashboard" }],
  },
  {
    title: "Sales",
    items: [
      { href: "/merchant/orders", label: "Orders" },
      { href: "/merchant/outstanding", label: "Outstanding" },
      { href: "/merchant/products", label: "Products" },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/merchant/payouts", label: "Payouts" },
      { href: "/merchant/settings", label: "Settings" },
    ],
  },
];

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const merchant = useAppSelector(selectMerchant);
  return (
    <DashboardShell
      role={UserRole.MERCHANT}
      sections={SECTIONS}
      context={
        merchant && (
          <span className="flex items-center gap-3">
            <span className="font-medium text-ink">{merchant.name}</span>
            {merchant.status !== MerchantStatus.ACTIVE && <Badge type="MERCHANT_STATUS">{merchant.status}</Badge>}
          </span>
        )
      }
    >
      {children}
    </DashboardShell>
  );
}
