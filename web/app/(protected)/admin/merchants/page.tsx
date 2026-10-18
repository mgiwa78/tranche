"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminRole, MerchantStatus, hasAdminRole } from "@tranche/shared";
import { MERCHANT_STATUS_LABELS } from "@/constants/enums";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Badge } from "@/components/ui/Badge";
import { formatBps, formatDate, formatNaira } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import { useAppSelector } from "@/store/hooks";
import { selectAdminRole } from "@/store/selectors/authSelectors";
import { useListAdminMerchantsQuery, useUpdateMerchantStatusMutation } from "@/store/rtk/adminSlice/adminSlices";
import type { AdminMerchantView } from "@/types/global";

type Row = AdminMerchantView & Record<string, unknown>;

export default function AdminMerchantsPage() {
  const router = useRouter();
  const role = useAppSelector(selectAdminRole);
  const list = useListParams({ status: "" });
  const { data, isFetching } = useListAdminMerchantsQuery(list.query as never);
  const [updateStatus] = useUpdateMerchantStatusMutation();

  const setStatus = async (row: Row, status: MerchantStatus) => {
    try {
      await updateStatus({ id: row.id, body: { status } }).unwrap();
      toast.success(`${row.name} is now ${MERCHANT_STATUS_LABELS[status].toLowerCase()}`);
    } catch {
      /* toasted */
    }
  };

  return (
    <div>
      <PageHeader title="Merchants" subtitle="Stores selling with Tranche. New stores wait here for approval." />
      <DynamicTable<Row>
        data={(data?.data ?? []) as Row[]}
        isLoading={isFetching && !data}
        rowKey="id"
        viewAction={(row) => router.push(`/admin/merchants/${row.id}`)}
        search={{ value: list.searchInput, placeholder: "Search stores…", onChange: list.setSearchInput }}
        filters={[
          {
            name: "Status",
            value: list.params.status,
            options: [
              { label: "All statuses", value: "" },
              ...Object.values(MerchantStatus).map((s) => ({ label: MERCHANT_STATUS_LABELS[s], value: s })),
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
                  label: "Approve",
                  allowed: (r) => r.status === MerchantStatus.PENDING,
                  onClick: (r) => setStatus(r, MerchantStatus.ACTIVE),
                },
                {
                  label: "Reactivate",
                  allowed: (r) => r.status === MerchantStatus.SUSPENDED,
                  onClick: (r) => setStatus(r, MerchantStatus.ACTIVE),
                },
                {
                  label: "Suspend",
                  tone: "danger",
                  allowed: (r) => r.status === MerchantStatus.ACTIVE,
                  onClick: (r) => setStatus(r, MerchantStatus.SUSPENDED),
                },
              ]
            : undefined
        }
        columns={[
          {
            header: "Store",
            accessor: "name",
            render: (v, row) => (
              <span>
                <span className="block font-medium text-ink">{String(v)}</span>
                <span className="block text-xs text-faint">{row.ownerEmail}</span>
              </span>
            ),
          },
          { header: "Status", accessor: "status", render: (v) => <Badge type="MERCHANT_STATUS">{String(v)}</Badge> },
          { header: "Fee", accessor: "feeBps", render: (v) => formatBps(Number(v)) },
          { header: "Orders", accessor: "ordersCount", render: (v) => <span className="tnum">{String(v)}</span> },
          {
            header: "Financed",
            accessor: "gmvKobo",
            render: (v) => <span className="tnum">{formatNaira(Number(v))}</span>,
          },
          {
            header: "Owed to them",
            accessor: "availableKobo",
            render: (v) => <span className="tnum">{formatNaira(Number(v))}</span>,
          },
          { header: "Joined", accessor: "createdAt", render: (v) => formatDate(String(v)) },
        ]}
      />
    </div>
  );
}
