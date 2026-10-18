"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserRole } from "@tranche/shared";
import { useAppSelector } from "@/store/hooks";
import { selectAuthHydrated, selectIsAuthenticated, selectRole } from "@/store/selectors/authSelectors";

/**
 * Client-side gate (no middleware.ts: tokens live in localStorage, which middleware can't
 * read). Waits for hydration so a reload doesn't flash a redirect, then bounces anyone who
 * isn't signed in with the role this area needs. The api enforces the same rule.
 */
export function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAppSelector(selectAuthHydrated);
  const authenticated = useAppSelector(selectIsAuthenticated);
  const current = useAppSelector(selectRole);
  const allowed = authenticated && current === role;

  useEffect(() => {
    if (hydrated && !allowed) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, allowed, router, pathname]);

  if (!hydrated || !allowed) return null;
  return <>{children}</>;
}
