import Link from "next/link";

const BAR_STYLES = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  idle: "bg-border-strong",
} as const;

export interface CalloutProps {
  tone: keyof typeof BAR_STYLES;
  title: string;
  detail?: string;
  action?: string;
  href?: string;
}

/** A status line in a `.ledger` row: no box of its own, the row draws the rules. */
export function Callout({ tone, title, detail, action, href }: CalloutProps) {
  const body = (
    <>
      <span aria-hidden="true" className={["h-8 w-1 rounded-full", BAR_STYLES[tone]].join(" ")} />
      <span className="flex-1 text-sm">
        <span className="block font-medium text-ink">{title}</span>
        {detail && <span className="block text-xs text-muted">{detail}</span>}
      </span>
      {action && <span className="text-sm text-muted transition-colors group-hover:text-accent-ink">{action}</span>}
    </>
  );
  const className = "flex items-center gap-4 px-5 py-4";
  return href ? (
    <Link href={href} className={`focus-ring group transition-colors hover:bg-canvas-subtle ${className}`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function CalloutRow({ children, columns = 1 }: { children: React.ReactNode; columns?: 1 | 2 }) {
  return (
    <div className={["ledger mb-10 grid-cols-1", columns === 2 && "sm:grid-cols-2"].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
