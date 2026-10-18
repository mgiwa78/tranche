/**
 * The Tranche mark: a full bar split into four segments, the first one filled.
 * "Own it now, pay in parts." Solid by default, or white for dark surfaces.
 */
export function LogoMark({ className, tone = "brand" }: { className?: string; tone?: "brand" | "white" }) {
  const solid = tone === "white" ? "#fff" : "var(--accent)";
  const soft = tone === "white" ? "rgba(255,255,255,0.45)" : "var(--border-strong)";
  return (
    <svg viewBox="0 0 40 24" fill="none" className={className} aria-hidden="true">
      <rect x="0" y="4" width="10" height="16" rx="3" fill={solid} />
      <rect x="10.5" y="4" width="9" height="16" rx="3" fill={soft} />
      <rect x="20" y="4" width="9" height="16" rx="3" fill={soft} />
      <rect x="29.5" y="4" width="10.5" height="16" rx="3" fill={soft} />
    </svg>
  );
}

/** App-icon tile: white mark on the brand colour. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={["inline-flex items-center justify-center rounded-[22%] bg-accent", className]
        .filter(Boolean)
        .join(" ")}
    >
      <LogoMark tone="white" className="h-auto w-[64%]" />
    </span>
  );
}

/** Mark + wordmark. `onDark` switches the wordmark to white. */
export function Logo({
  onDark = false,
  tagline = false,
  className,
}: {
  onDark?: boolean;
  tagline?: boolean;
  className?: string;
}) {
  return (
    <span className={["inline-flex items-center gap-2.5", className].filter(Boolean).join(" ")}>
      <LogoMark tone={onDark ? "white" : "brand"} className="h-6 w-10 flex-shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className={[
            "font-brand text-[1.3rem] font-medium tracking-[-0.03em]",
            onDark ? "text-white" : "text-ink",
          ].join(" ")}
        >
          tranche
        </span>
        {tagline && (
          <span className={["mt-1.5 text-[0.6rem] font-medium", onDark ? "text-white/60" : "text-faint"].join(" ")}>
            Buy now, pay in parts
          </span>
        )}
      </span>
    </span>
  );
}
