"use client";

import { AdminRole, ADMIN_ROLE_LABELS, hasAdminRole } from "@/constants/enums";
import { useAppSelector } from "@/store/hooks";
import { selectAdminRole } from "@/store/selectors/authSelectors";

/**
 * Page-level role gate for direct URL hits. The sidebar already hides links
 * and the API enforces roles, so this only gives a clear message instead of
 * a page full of 403 toasts.
 */
export function RequireRole({ minimum, children }: { minimum: AdminRole; children: React.ReactNode }) {
  const role = useAppSelector(selectAdminRole);
  if (hasAdminRole(role, minimum)) return <>{children}</>;
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium text-ink">You don&apos;t have access to this section</p>
      <p className="mt-1 text-sm text-muted">It requires the {ADMIN_ROLE_LABELS[minimum]} role or higher.</p>
    </div>
  );
}
