/** Uppercase eyebrow + content: the dashboard's only section heading style. */
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
    <div className="flex gap-1 rounded-control border border-border p-0.5" role="group" aria-label="Period">
      {[7, 30, 90].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          aria-pressed={value === d}
          className={[
            "press focus-ring rounded-[4px] px-2.5 py-1 text-xs",
            value === d ? "bg-canvas-subtle font-medium text-ink" : "text-muted hover:text-ink",
          ].join(" ")}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}
