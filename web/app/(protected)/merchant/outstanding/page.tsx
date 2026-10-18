"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Badge } from "@/components/ui/Badge";
import { StatCard, StatGrid } from "@/components/ui/Card";
import { formatDate, formatNaira, formatNairaCompact } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import { useGetMerchantBalanceQuery, useListOutstandingQuery } from "@/store/rtk/merchantSlice/merchantSlices";
import type { OutstandingBalanceView } from "@/types/global";

type Row = OutstandingBalanceView & Record<string, unknown>;

export default function OutstandingPage() {
  const router = useRouter();
  const list = useListParams({});
  const { data, isFetching } = useListOutstandingQuery(list.query as never);
  const { data: balance } = useGetMerchantBalanceQuery();
  const overdue = (data?.data ?? []).reduce((t, r) => t + r.overdueKobo, 0);

  return (
    <div>
      <PageHeader
        title="Outstanding balances"
        subtitle="What shoppers still owe on your orders. You've already been paid for these; this is for your records."
      />
      <StatGrid columns={2} className="mb-8">
        <StatCard label="Outstanding" value={formatNairaCompact(balance?.outstandingKobo)} />
        <StatCard
          label="Overdue on this page"
          value={formatNairaCompact(overdue)}
          tone={overdue ? "warning" : "default"}
        />
      </StatGrid>
      <DynamicTable<Row>
        data={(data?.data ?? []) as Row[]}
        isLoading={isFetching && !data}
        rowKey="orderId"
        emptyMessage="Nothing outstanding. Every plan in your store is paid off."
        viewAction={(row) => router.push(`/merchant/orders/${row.orderId}`)}
        search={{
          value: list.searchInput,
          placeholder: "Search reference, name or email…",
          onChange: list.setSearchInput,
        }}
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
          {
            header: "Shopper",
            accessor: "customerName",
            render: (v, row) => (
              <span>
                <span className="block text-ink">{String(v ?? "—")}</span>
                <span className="block text-xs text-faint">{row.customerEmail}</span>
              </span>
            ),
          },
          {
            header: "Order total",
            accessor: "totalKobo",
            render: (v) => <span className="tnum">{formatNaira(Number(v))}</span>,
          },
          {
            header: "Outstanding",
            accessor: "outstandingKobo",
            render: (v) => <span className="tnum font-medium">{formatNaira(Number(v))}</span>,
          },
          {
            header: "Overdue",
            accessor: "overdueKobo",
            render: (v) => (
              <span className={["tnum", Number(v) ? "text-warning" : "text-faint"].join(" ")}>
                {Number(v) ? formatNaira(Number(v)) : "—"}
              </span>
            ),
          },
          { header: "Next due", accessor: "nextDueDate", render: (v) => formatDate(v as string | null) },
          { header: "Status", accessor: "status", render: (v) => <Badge type="ORDER_STATUS">{String(v)}</Badge> },
        ]}
      />
    </div>
  );
}
