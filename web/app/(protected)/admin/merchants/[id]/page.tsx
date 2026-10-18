"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminRole, MerchantStatus, hasAdminRole, updateMerchantFeeSchema, validateWith } from "@tranche/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicView } from "@/components/ui/DynamicView";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatCard, StatGrid } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { formatBps, formatDate, formatNaira, formatNairaCompact } from "@/helpers/helpers";
import { useAppSelector } from "@/store/hooks";
import { selectAdminRole } from "@/store/selectors/authSelectors";
import {
  useGetAdminMerchantQuery,
  useListAdminOrdersQuery,
  useUpdateMerchantFeeMutation,
  useUpdateMerchantStatusMutation,
} from "@/store/rtk/adminSlice/adminSlices";
import type { OrderView } from "@/types/global";

type OrderRow = OrderView & Record<string, unknown>;

export default function AdminMerchantPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useAppSelector(selectAdminRole);
  const { data: m } = useGetAdminMerchantQuery(id);
  const { data: orders } = useListAdminOrdersQuery({ merchantId: id, limit: 10 });
  const [updateStatus, { isLoading: statusSaving }] = useUpdateMerchantStatusMutation();
  const [updateFee, { isLoading: feeSaving }] = useUpdateMerchantFeeMutation();
  const [fee, setFee] = useState("");
  const [feeError, setFeeError] = useState<string>();

  if (!m) return <p className="text-sm text-muted">Loading…</p>;

  async function setStatus(status: MerchantStatus) {
    try {
      await updateStatus({ id, body: { status } }).unwrap();
      toast.success("Merchant updated");
    } catch {
      /* toasted */
    }
  }

  async function saveFee() {
    const result = validateWith(updateMerchantFeeSchema, { feeBps: Math.round(Number(fee) * 100) });
    if (!result.ok) return setFeeError(result.errors.feeBps);
    setFeeError(undefined);
    try {
      await updateFee({ id, feeBps: result.data.feeBps }).unwrap();
      toast.success("Fee updated for new orders");
      setFee("");
    } catch {
      /* toasted */
    }
  }

  const canManage = hasAdminRole(role, AdminRole.ADMIN);

  return (
    <div>
      <PageHeader
        title={m.name}
        leading={
          <Link href="/admin/merchants" className="text-sm text-muted hover:text-ink">
            ← Merchants
          </Link>
        }
        actions={
          canManage && (
            <div className="flex gap-2">
              {m.status !== MerchantStatus.ACTIVE && (
                <Button size="sm" loading={statusSaving} onClick={() => setStatus(MerchantStatus.ACTIVE)}>
                  {m.status === MerchantStatus.PENDING ? "Approve store" : "Reactivate"}
                </Button>
              )}
              {m.status === MerchantStatus.ACTIVE && (
                <Button
                  size="sm"
                  variant="destructive"
                  loading={statusSaving}
                  onClick={() => setStatus(MerchantStatus.SUSPENDED)}
                >
                  Suspend
                </Button>
              )}
            </div>
          )
        }
      />

      <StatGrid columns={3} className="mb-10">
        <StatCard label="Financed" value={formatNairaCompact(m.gmvKobo)} hint={`${m.ordersCount} orders`} />
        <StatCard label="Owed to merchant" value={formatNairaCompact(m.availableKobo)} />
        <StatCard label="Fee" value={formatBps(m.feeBps)} />
      </StatGrid>

      <div className="mb-10 grid gap-10 lg:grid-cols-2">
        <DynamicView
          sections={[
            {
              title: "Store",
              fields: [
                { label: "Status", value: <Badge type="MERCHANT_STATUS">{m.status}</Badge> },
                { label: "Owner", value: m.ownerEmail ?? "—" },
                { label: "Support", value: m.supportEmail ?? "—" },
                { label: "Slug", value: <span className="font-mono">{m.slug}</span> },
                { label: "Joined", value: formatDate(m.createdAt) },
              ],
            },
            {
              title: "Settlement",
              fields: [
                { label: "Bank code", value: m.settlementBankCode ?? "—" },
                { label: "Account", value: m.settlementAccountNumber ?? "Not set" },
                { label: "Name", value: m.settlementAccountName ?? "—" },
              ],
            },
          ]}
        />
        {hasAdminRole(role, AdminRole.SUPER_ADMIN) && (
          <Section title="Merchant fee">
            <p className="mb-3 text-sm text-muted">
              Applies to new orders. Existing orders keep the fee they were placed with.
            </p>
            <div className="flex items-start gap-2">
              <Input
                id="fee"
                label="Fee (%)"
                inputMode="decimal"
                placeholder={(m.feeBps / 100).toString()}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                error={feeError}
              />
              <Button className="mt-6" size="md" variant="secondary" loading={feeSaving} onClick={saveFee}>
                Save
              </Button>
            </div>
          </Section>
        )}
      </div>

      <Section title="Recent orders">
        <DynamicTable<OrderRow>
          data={(orders?.data ?? []) as OrderRow[]}
          rowKey="id"
          emptyMessage="No orders yet."
          viewAction={(row) => router.push(`/admin/orders/${row.id}`)}
          columns={[
            {
              header: "Reference",
              accessor: "reference",
              render: (v) => <span className="font-mono text-sm">{String(v)}</span>,
            },
            { header: "Shopper", accessor: "customerName" },
            {
              header: "Total",
              accessor: "totalKobo",
              render: (v) => <span className="tnum">{formatNaira(Number(v))}</span>,
            },
            { header: "Status", accessor: "status", render: (v) => <Badge type="ORDER_STATUS">{String(v)}</Badge> },
            { header: "Placed", accessor: "createdAt", render: (v) => formatDate(String(v)) },
          ]}
        />
      </Section>
    </div>
  );
}
