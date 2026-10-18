export interface ViewField {
  label: string;
  value: React.ReactNode;
  labelWidth?: string;
}

export interface ViewSection {
  title: string;
  fields: ViewField[];
}

/** Detail layout: an overline title over ruled label/value rows. */
export function DynamicView({ sections }: { sections: ViewSection[] }) {
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-faint">{section.title}</h2>
          <dl className="divide-y divide-border border-y border-border">
            {section.fields.map((field) => (
              <div key={field.label} className="flex items-baseline gap-4 py-2.5 text-sm">
                <dt className={["flex-shrink-0 text-muted", field.labelWidth ?? "w-36"].join(" ")}>{field.label}</dt>
                <dd className="min-w-0 break-words text-ink">{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
