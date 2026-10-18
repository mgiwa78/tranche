export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={["rounded-surface border border-border p-5", className].filter(Boolean).join(" ")}>{children}</div>
  );
}

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  /** Colors the figure only when something needs attention. */
  tone?: "default" | "warning" | "danger";
}

const TONE_STYLES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-ink",
  warning: "text-warning",
  danger: "text-danger",
};

/** One figure in a `.ledger` grid. No box of its own: the grid draws the rules. */
export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={["font-brand mt-1.5 text-[1.75rem] font-medium leading-none tracking-tight", TONE_STYLES[tone]].join(
          " ",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-faint">{hint}</p>}
    </div>
  );
}

/** A ruled grid of StatCards. */
export function StatGrid({
  columns = 4,
  className,
  children,
}: {
  columns?: 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
}) {
  const cols = columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return <div className={["ledger grid-cols-1", cols, className].filter(Boolean).join(" ")}>{children}</div>;
}
