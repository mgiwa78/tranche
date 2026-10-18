export function Section({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={["mb-10", className].filter(Boolean).join(" ")}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-faint">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function PeriodPicker({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div className="flex gap-4" role="group" aria-label="Period">
      {[7, 30, 90].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          aria-pressed={value === d}
          className={[
            "focus-ring rounded-[2px] border-b-2 pb-1 text-xs transition-colors",
            value === d ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink",
          ].join(" ")}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}
