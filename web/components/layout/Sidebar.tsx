"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";

export interface NavItem {
  href: string;
  label: string;
  /** Hide the item when false (e.g. role checks); the api enforces the same rule. */
  visible?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Text-only navigation on the page background, separated by a single rule.
 * The active item gets a small capsule in the brand colour, echoing the Tranche mark.
 */
export function Sidebar({ sections, footer }: { sections: NavSection[]; footer?: React.ReactNode }) {
  const pathname = usePathname();
  const visible = sections
    .map((section) => ({ ...section, items: section.items.filter((i) => i.visible !== false) }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-canvas">
      <div className="px-6 pb-6 pt-6">
        <Link href="/" className="focus-ring rounded-control">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {visible.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="px-3 pb-1.5 text-xs text-faint">{section.title}</p>
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "focus-ring relative flex items-center rounded-control px-3 py-1.5 text-sm transition-colors",
                    active ? "font-medium text-ink" : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-0.5 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-accent"
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {footer && <div className="border-t border-border px-6 py-4">{footer}</div>}
    </aside>
  );
}
