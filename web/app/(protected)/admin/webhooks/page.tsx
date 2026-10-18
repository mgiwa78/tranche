"use client";

import { toast } from "sonner";
import { AdminRole, WebhookEventStatus, hasAdminRole } from "@tranche/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import { useAppSelector } from "@/store/hooks";
import { selectAdminRole } from "@/store/selectors/authSelectors";
import { useListWebhookEventsQuery, useReplayWebhookEventMutation } from "@/store/rtk/adminSlice/adminSlices";
import type { WebhookEventView } from "@/types/global";

type Row = WebhookEventView & Record<string, unknown>;

export default function AdminWebhooksPage() {
  const role = useAppSelector(selectAdminRole);
  const list = useListParams({ status: "" });
  const { data, isFetching } = useListWebhookEventsQuery(list.query as never);
  const [replay] = useReplayWebhookEventMutation();

  return (
    <div>
      <PageHeader
        title="Webhooks"
        subtitle="Every Paystack event, stored before processing. Duplicates are acknowledged once; failures retry with backoff."
      />
      <DynamicTable<Row>
        data={(data?.data ?? []) as Row[]}
        isLoading={isFetching && !data}
        rowKey="id"
        emptyMessage="No webhook events yet."
        search={{ value: list.searchInput, placeholder: "Search event or reference…", onChange: list.setSearchInput }}
        filters={[
          {
            name: "Status",
            value: list.params.status,
            options: [
              { label: "All statuses", value: "" },
              ...Object.values(WebhookEventStatus).map((s) => ({ label: s[0].toUpperCase() + s.slice(1), value: s })),
            ],
            onChange: (v) => list.setFilter("status", v),
          },
        ]}
        pagination={{
          page: list.params.page,
          limit: list.params.limit,
          totalPages: data?.meta.totalPages ?? 1,
          totalItems: data?.meta.total,
          onPageChange: list.setPage,
        }}
        actions={
          hasAdminRole(role, AdminRole.ADMIN)
            ? [
                {
                  label: "Replay",
                  allowed: (r) => r.status === WebhookEventStatus.FAILED,
                  onClick: async (r) => {
                    try {
                      await replay(r.id).unwrap();
                      toast.success("Queued for processing");
                    } catch {
                      /* toasted */
                    }
                  },
                },
              ]
            : undefined
        }
        columns={[
          { header: "Event", accessor: "event", render: (v) => <span className="font-mono text-sm">{String(v)}</span> },
          {
            header: "Reference",
            accessor: "reference",
            render: (v) => <span className="font-mono text-xs text-muted">{(v as string) ?? "—"}</span>,
          },
          { header: "Status", accessor: "status", render: (v) => <Badge type="WEBHOOK_STATUS">{String(v)}</Badge> },
          { header: "Attempts", accessor: "attempts", render: (v) => <span className="tnum">{String(v)}</span> },
          {
            header: "Error",
            accessor: "error",
            render: (v) => <span className="text-xs text-danger">{(v as string) ?? ""}</span>,
          },
          { header: "Received", accessor: "createdAt", render: (v) => formatDateTime(String(v)) },
        ]}
      />
    </div>
  );
}
