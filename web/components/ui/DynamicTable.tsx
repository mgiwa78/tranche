"use client";

import { DotsThreeIcon, SpinnerIcon } from "@/components/icons";
import { FilterBar, type FilterConfig } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";

export interface TableColumn<T> {
  header: string;
  accessor: keyof T & string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface TableAction<T> {
  label: string;
  onClick: (row: T) => void;
  allowed?: (row: T) => boolean;
  tone?: "default" | "danger";
}

export interface DynamicTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  isLoading?: boolean;
  rowKey: keyof T & string;
  emptyMessage?: string;
  viewAction?: (row: T) => void;
  actions?: TableAction<T>[];
  search?: { value: string; placeholder?: string; onChange: (value: string) => void };
  filters?: FilterConfig[];
  pagination?: {
    page: number;
    onPageChange: (page: number) => void;
    totalPages?: number;
    hasNext?: boolean;
    totalItems?: number;
    limit: number;
  };
}

/**
 * One generic
 * table drives every admin list page via props (loading/empty rows,
 * per-column render(), a viewAction row-click, and a per-row action menu),
 * so no page hand-rolls its own <table> markup.
 *
 * Simplification vs. the reference: row actions use a native <details>
 * dropdown instead of a portal + getBoundingClientRect, matching the
 * zero-JS pattern. Trade-off:
 * a menu near the table's right edge can clip against overflow-x-auto —
 * acceptable for this table's column counts, worth a portal if that
 * changes.
 */
export function DynamicTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading,
  rowKey,
  emptyMessage = "No records found.",
  viewAction,
  actions,
  search,
  filters,
  pagination,
}: DynamicTableProps<T>) {
  return (
    <div className="rounded-surface border border-border">
      <FilterBar search={search} filters={filters} />

      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-faint">
              {columns.map((col) => (
                <th key={col.accessor} className="px-5 py-2.5 font-medium">
                  {col.header}
                </th>
              ))}
              {actions?.length ? <th className="px-5 py-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-10 text-center text-sm text-faint">
                  <SpinnerIcon className="mx-auto h-5 w-5 text-muted" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-12 text-center text-sm text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const key = String(row[rowKey]);
                const rowActions = actions?.filter((a) => a.allowed?.(row) ?? true) ?? [];
                return (
                  <tr
                    key={key}
                    onClick={viewAction ? () => viewAction(row) : undefined}
                    className={viewAction ? "cursor-pointer hover:bg-canvas-subtle/70" : ""}
                  >
                    {columns.map((col) => (
                      <td key={col.accessor} className="px-5 py-3">
                        {col.render ? col.render(row[col.accessor], row) : String(row[col.accessor] ?? "—")}
                      </td>
                    ))}
                    {actions?.length ? (
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions.length > 0 && (
                          <details className="group relative inline-block">
                            <summary
                              aria-label="Row actions"
                              className="press focus-ring inline-flex h-7 w-7 items-center justify-center rounded-control hover:bg-canvas"
                            >
                              <DotsThreeIcon className="h-4 w-4 text-muted" />
                            </summary>
                            <div
                              className="pop-in absolute right-0 top-[calc(100%+4px)] z-10 w-44 rounded-surface border border-border bg-surface p-1.5 shadow-md"
                              style={{ ["--pop-origin" as string]: "top right" }}
                            >
                              {rowActions.map((action) => (
                                <button
                                  key={action.label}
                                  type="button"
                                  onClick={(e) => {
                                    (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute(
                                      "open",
                                    );
                                    action.onClick(row);
                                  }}
                                  className={[
                                    "press block w-full rounded-control px-3 py-2 text-left text-sm hover:bg-canvas-subtle",
                                    action.tone === "danger" ? "text-danger" : "text-ink",
                                  ].join(" ")}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </details>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-faint">
            {pagination.totalItems !== undefined
              ? `Showing ${data.length ? (pagination.page - 1) * pagination.limit + 1 : 0}–${
                  (pagination.page - 1) * pagination.limit + data.length
                } of ${pagination.totalItems}`
              : `Page ${pagination.page}`}
          </p>
          <Pagination
            page={pagination.page}
            onPageChange={pagination.onPageChange}
            totalPages={pagination.totalPages}
            hasNext={pagination.hasNext}
          />
        </div>
      )}
    </div>
  );
}
