"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MIN_PAYOUT_KOBO, requestPayoutSchema, toKobo, validateWith } from "@tranche/shared";
import { PAYOUT_STATUS_LABELS, PayoutStatus } from "@/constants/enums";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatCard, StatGrid } from "@/components/ui/Card";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { formatDateTime, formatNaira, formatNairaCompact, fromKobo } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import {
  useGetMerchantBalanceQuery,
  useGetMerchantProfileQuery,
  useListMerchantPayoutsQuery,
  useRequestPayoutMutation,
} from "@/store/rtk/merchantSlice/merchantSlices";
import type { PayoutView } from "@/types/global";

type Row = PayoutView & Record<string, unknown>;

export default function MerchantPayoutsPage() {
  const modal = useRef<ModalHandle>(null);
  const list = useListParams({ status: "" });
  const { data, isFetching } = useListMerchantPayoutsQuery(list.query as never);
  const { data: balance } = useGetMerchantBalanceQuery();
  const { data: profile } = useGetMerchantProfileQuery();
  const [requestPayout, { isLoading }] = useRequestPayoutMutation();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();

  const available = balance?.availableKobo ?? 0;
  const hasBank = Boolean(profile?.settlementAccountNumber && profile?.settlementBankCode);

  function open() {
    setAmount(available >= MIN_PAYOUT_KOBO ? String(fromKobo(available)) : "");
    setError(undefined);
    modal.current?.open();
  }

  async function submit() {
    const amountKobo = toKobo(Number(amount.replace(/,/g, "")));
    const result = validateWith(requestPayoutSchema, { amountKobo });
    if (!result.ok) return setError(result.errors.amountKobo);
    if (amountKobo > available) return setError(`You can withdraw up to ${formatNaira(available)}`);
    setError(undefined);
    try {
      await requestPayout(result.data).unwrap();
      toast.success("Payout requested. We'll review it shortly.");
      modal.current?.close();
    } catch {
      /* toasted */
    }
  }

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle="Withdraw what Tranche owes you to your settlement account."
        actions={
          <Button onClick={open} disabled={!hasBank || available < MIN_PAYOUT_KOBO}>
            Request payout
          </Button>
        }
      />

      {!hasBank && profile && (
        <p className="mb-6 text-sm text-muted">
          Add a settlement account in{" "}
          <Link href="/merchant/settings" className="text-accent hover:underline">
            Settings
          </Link>{" "}
          before requesting a payout.
        </p>
      )}

      <StatGrid columns={3} className="mb-8">
        <StatCard label="Available" value={formatNairaCompact(balance?.availableKobo)} />
        <StatCard label="On the way" value={formatNairaCompact(balance?.pendingPayoutKobo)} />
        <StatCard label="Paid out, all time" value={formatNairaCompact(balance?.lifetimePaidOutKobo)} />
      </StatGrid>

      <Modal ref={modal} title="Request payout" description={`Up to ${formatNaira(available)} is available.`}>
        <div className="flex flex-col gap-4">
          <Input
            id="payout-amount"
            label="Amount (₦)"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={error}
            hint={
              profile?.settlementAccountNumber
                ? `To ${profile.settlementAccountName ?? "your account"} ${profile.settlementAccountNumber}`
                : undefined
            }
          />
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => modal.current?.close()}>
              Cancel
            </Button>
            <Button size="sm" loading={isLoading} onClick={submit}>
              Request payout
            </Button>
          </div>
        </div>
      </Modal>

      <DynamicTable<Row>
        data={(data?.data ?? []) as Row[]}
        isLoading={isFetching && !data}
        rowKey="id"
        emptyMessage="No payouts yet."
        filters={[
          {
            name: "Status",
            value: list.params.status,
            options: [
              { label: "All statuses", value: "" },
              ...Object.values(PayoutStatus).map((s) => ({ label: PAYOUT_STATUS_LABELS[s], value: s })),
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
          {
            header: "Amount",
            accessor: "amountKobo",
            render: (v) => <span className="tnum">{formatNaira(Number(v), { exact: true })}</span>,
          },
          { header: "Status", accessor: "status", render: (v) => <Badge type="PAYOUT_STATUS">{String(v)}</Badge> },
          { header: "Requested", accessor: "createdAt", render: (v) => formatDateTime(String(v)) },
          { header: "Completed", accessor: "processedAt", render: (v) => formatDateTime(v as string | null) },
          {
            header: "Note",
            accessor: "failureReason",
            render: (v) => <span className="text-muted">{(v as string) ?? ""}</span>,
          },
        ]}
      />
    </div>
  );
}
