import { CaretDownIcon } from "@/components/icons";

export interface PaginationProps {
  page: number;
  onPageChange: (page: number) => void;
  totalPages?: number;
  hasNext?: boolean;
}

/**
 * Two modes: with `totalPages` (users/reports), renders numbered pages.
 * Without it (audit-logs, whose API meta has no total/totalPages), falls
 * back to prev/next only, gated by `hasNext`.
 */
export function Pagination({ page, onPageChange, totalPages, hasNext }: PaginationProps) {
  const prevDisabled = page <= 1;

  if (totalPages === undefined) {
    const nextDisabled = hasNext === false;
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={prevDisabled}
          onClick={() => onPageChange(page - 1)}
          className="press focus-ring flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-canvas-subtle disabled:opacity-30"
        >
          <CaretDownIcon className="h-3.5 w-3.5 rotate-90" />
        </button>
        <span className="px-2 text-xs text-faint">Page {page}</span>
        <button
          type="button"
          aria-label="Next page"
          disabled={nextDisabled}
          onClick={() => onPageChange(page + 1)}
          className="press focus-ring flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-canvas-subtle disabled:opacity-30"
        >
          <CaretDownIcon className="h-3.5 w-3.5 -rotate-90" />
        </button>
      </div>
    );
  }

  const pages = buildPageList(page, totalPages);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous page"
        disabled={prevDisabled}
        onClick={() => onPageChange(page - 1)}
        className="press focus-ring flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-canvas-subtle disabled:opacity-30"
      >
        <CaretDownIcon className="h-3.5 w-3.5 rotate-90" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="flex h-7 w-7 items-center justify-center text-xs text-faint">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={[
              "press focus-ring flex h-7 w-7 items-center justify-center rounded-control text-xs font-medium",
              p === page ? "bg-accent text-accent-contrast" : "text-muted hover:bg-canvas-subtle",
            ].join(" ")}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="press focus-ring flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-canvas-subtle disabled:opacity-30"
      >
        <CaretDownIcon className="h-3.5 w-3.5 -rotate-90" />
      </button>
    </div>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}
