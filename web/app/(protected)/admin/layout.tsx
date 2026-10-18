"use client";

import { AdminRole, ADMIN_ROLE_LABELS, UserRole, hasAdminRole } from "@tranche/shared";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { NavSection } from "@/components/layout/Sidebar";
import { useAppSelector } from "@/store/hooks";
import { selectAdminRole } from "@/store/selectors/authSelectors";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = useAppSelector(selectAdminRole);
  const can = (min: AdminRole) => hasAdminRole(role, min);

  const sections: NavSection[] = [
    { title: "Overview", items: [{ href: "/admin/dashboard", label: "Dashboard" }] },
    {
      title: "Operations",
      items: [
        { href: "/admin/orders", label: "Orders" },
        { href: "/admin/payouts", label: "Payouts" },
        { href: "/admin/merchants", label: "Merchants" },
        { href: "/admin/customers", label: "Customers" },
      ],
    },
    {
      title: "Finance",
      items: [
        { href: "/admin/ledger", label: "Ledger" },
        { href: "/admin/webhooks", label: "Webhooks" },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/admin/audit-logs", label: "Audit log", visible: can(AdminRole.ADMIN) },
        { href: "/admin/settings", label: "Settings" },
      ],
    },
  ];

  return (
    <DashboardShell
      role={UserRole.ADMIN}
      sections={sections}
      context={role && <span>Tranche staff · {ADMIN_ROLE_LABELS[role]}</span>}
    >
      {children}
    </DashboardShell>
  );
}
