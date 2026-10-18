export function PageHeader({
  title,
  subtitle,
  actions,
  leading,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        {leading}
        <div>
          <h1 className="font-brand text-[1.65rem] font-medium leading-tight tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
