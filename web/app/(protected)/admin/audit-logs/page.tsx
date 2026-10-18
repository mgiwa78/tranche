"use client";

import { AdminRole } from "@tranche/shared";
import { RequireRole } from "@/components/auth/RequireRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { formatDateTime, truncateId } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import { useListAuditLogsQuery } from "@/store/rtk/adminSlice/adminSlices";
import type { AuditLogView } from "@/types/global";

type Row = AuditLogView & Record<string, unknown>;

function AuditLogsView() {
  const list = useListParams({});
  const { data, isFetching } = useListAuditLogsQuery(list.query as never);

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Sign-ins and every staff action, newest first." />
      <DynamicTable<Row>
        data={(data?.data ?? []) as Row[]}
        isLoading={isFetching && !data}
        rowKey="id"
        search={{
          value: list.searchInput,
          placeholder: "Filter by action, e.g. payout…",
          onChange: list.setSearchInput,
        }}
        pagination={{
          page: list.params.page,
          limit: list.params.limit,
          hasNext: data?.meta.hasMore,
          onPageChange: list.setPage,
        }}
        columns={[
          {
            header: "Action",
            accessor: "action",
            render: (v) => <span className="font-mono text-sm">{String(v)}</span>,
          },
          {
            header: "Resource",
            accessor: "resourceType",
            render: (v, row) => (
              <span className="text-muted">
                {String(v)} <span className="font-mono text-xs text-faint">{truncateId(row.resourceId)}</span>
              </span>
            ),
          },
          {
            header: "By",
            accessor: "userId",
            render: (v) => <span className="font-mono text-xs">{truncateId(v as string | null)}</span>,
          },
          {
            header: "Details",
            accessor: "metadata",
            render: (v) => (
              <span className="font-mono text-xs text-faint">{v ? JSON.stringify(v).slice(0, 80) : ""}</span>
            ),
          },
          { header: "When", accessor: "createdAt", render: (v) => formatDateTime(String(v)) },
        ]}
      />
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <RequireRole minimum={AdminRole.ADMIN}>
      <AuditLogsView />
    </RequireRole>
  );
}
