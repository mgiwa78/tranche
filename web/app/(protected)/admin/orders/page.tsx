"use client";

import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS, OrderStatus, PLAN_LABELS } from "@/constants/enums";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatNaira } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import { useListAdminOrdersQuery } from "@/store/rtk/adminSlice/adminSlices";
import type { OrderView } from "@/types/global";

type Row = OrderView & Record<string, unknown>;

export default function AdminOrdersPage() {
  const router = useRouter();
  const list = useListParams({ status: "" });
  const { data, isFetching } = useListAdminOrdersQuery(list.query as never);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Every order across every store." />
      <DynamicTable<Row>
        data={(data?.data ?? []) as Row[]}
        isLoading={isFetching && !data}
        rowKey="id"
        viewAction={(row) => router.push(`/admin/orders/${row.id}`)}
        search={{ value: list.searchInput, placeholder: "Search by reference…", onChange: list.setSearchInput }}
        filters={[
          {
            name: "Status",
            value: list.params.status,
            options: [
              { label: "All statuses", value: "" },
              ...Object.values(OrderStatus).map((s) => ({ label: ORDER_STATUS_LABELS[s], value: s })),
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
        columns={[
          {
            header: "Reference",
            accessor: "reference",
            render: (v) => <span className="font-mono text-sm">{String(v)}</span>,
          },
          { header: "Shopper", accessor: "customerName" },
          { header: "Store", accessor: "merchantName" },
          { header: "Plan", accessor: "planCode", render: (v) => PLAN_LABELS[v as keyof typeof PLAN_LABELS] },
          {
            header: "Total",
            accessor: "totalKobo",
            render: (v) => <span className="tnum">{formatNaira(Number(v))}</span>,
          },
          {
            header: "Outstanding",
            accessor: "outstandingKobo",
            render: (v) => <span className="tnum text-muted">{formatNaira(Number(v))}</span>,
          },
          { header: "Status", accessor: "status", render: (v) => <Badge type="ORDER_STATUS">{String(v)}</Badge> },
          { header: "Placed", accessor: "createdAt", render: (v) => formatDate(String(v)) },
        ]}
      />
    </div>
  );
}
