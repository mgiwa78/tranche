"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TabLink {
  href: string;
  label: string;
  /** Small number shown next to the label, e.g. how many records the tab holds. */
  count?: number;
}

/**
 * Route-based tabs: each tab is a real URL, so it can be linked to, opened in
 * a new tab, and works with the browser's back button. The active tab is the
 * one whose href equals the current path.
 */
export function TabNav({ tabs, label }: { tabs: TabLink[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="mb-8 flex gap-6 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={[
              "focus-ring -mb-px flex flex-shrink-0 items-center gap-2 border-b-2 px-0.5 pb-3 text-sm transition-colors",
              active ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink",
            ].join(" ")}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && <span className="text-xs text-faint">{tab.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
