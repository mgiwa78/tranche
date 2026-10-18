"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { UserRole } from "@tranche/shared";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Sidebar, type NavSection } from "./Sidebar";
import { TopBar } from "./TopBar";

/** The reference admin layout (sidebar, mobile drawer, top bar), shared by both dashboard areas. */
export function DashboardShell({
  role,
  sections,
  context,
  sidebarFooter,
  children,
}: {
  role: UserRole;
  sections: NavSection[];
  context?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <RoleGuard role={role}>
      <div className="flex h-screen overflow-hidden">
        <div className="hidden h-full lg:flex">
          <Sidebar sections={sections} footer={sidebarFooter} />
        </div>

        {navOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/40"
              onClick={() => setNavOpen(false)}
            />
            <div className="relative h-full">
              <Sidebar sections={sections} footer={sidebarFooter} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar onOpenNav={() => setNavOpen(true)} context={context} />
          <main className="flex-1 overflow-y-auto bg-canvas px-4 py-8 sm:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
