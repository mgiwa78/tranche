"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AdminRole, hasAdminRole, reviewPayoutSchema, validateWith } from "@tranche/shared";
import { PAYOUT_STATUS_LABELS, PayoutStatus } from "@/constants/enums";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatDateTime, formatNaira } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import { useAppSelector } from "@/store/hooks";
import { selectAdminRole } from "@/store/selectors/authSelectors";
import { useListAdminPayoutsQuery, useReviewPayoutMutation } from "@/store/rtk/adminSlice/adminSlices";
import type { PayoutView } from "@/types/global";

type Row = PayoutView & Record<string, unknown>;

function PayoutsView() {
  const initialStatus = useSearchParams().get("status") ?? "";
  const role = useAppSelector(selectAdminRole);
  const canReview = hasAdminRole(role, AdminRole.ADMIN);
  const confirm = useConfirm();
  const rejectModal = useRef<ModalHandle>(null);
  const list = useListParams({ status: initialStatus });
  const { data, isFetching } = useListAdminPayoutsQuery(list.query as never);
  const [review, { isLoading }] = useReviewPayoutMutation();
  const [rejecting, setRejecting] = useState<PayoutView | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();

  async function approve(p: PayoutView) {
    const ok = await confirm({
      title: `Send ${formatNaira(p.amountKobo)} to ${p.merchantName ?? "the merchant"}?`,
      message: "Approving starts a Paystack transfer to their settlement account and posts the payout to the ledger.",
      confirmLabel: "Approve and send",
    });
    if (!ok) return;
    try {
      const res = await review({ id: p.id, body: { decision: "approve" } }).unwrap();
      toast.success(res.status === PayoutStatus.PAID ? "Payout sent" : "Payout approved, transfer in progress");
    } catch {
      /* toasted */
    }
  }

  async function reject() {
    if (!rejecting) return;
    const result = validateWith(reviewPayoutSchema, { decision: "reject", reason });
    if (!result.ok) return setReasonError(result.errors.reason);
    try {
      await review({ id: rejecting.id, body: result.data }).unwrap();
      toast.success("Payout rejected");
      rejectModal.current?.close();
    } catch {
      /* toasted */
    }
  }

  return (
    <div>
      <PageHeader title="Payouts" subtitle="Merchant withdrawal requests. Approval triggers the Paystack transfer." />

      <Modal ref={rejectModal} title="Reject payout" description="The merchant sees this reason.">
        <div className="flex flex-col gap-4">
          <Textarea
            id="reject-reason"
            label="Reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={reasonError}
          />
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => rejectModal.current?.close()}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" loading={isLoading} onClick={reject}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      <DynamicTable<Row>
        data={(data?.data ?? []) as Row[]}
        isLoading={isFetching && !data}
        rowKey="id"
        emptyMessage="No payouts match."
        search={{ value: list.searchInput, placeholder: "Search by reference…", onChange: list.setSearchInput }}
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
        actions={
          canReview
            ? [
                { label: "Approve and send", allowed: (r) => r.status === PayoutStatus.REQUESTED, onClick: approve },
                {
                  label: "Reject",
                  tone: "danger",
                  allowed: (r) => r.status === PayoutStatus.REQUESTED,
                  onClick: (r) => {
                    setRejecting(r);
                    setReason("");
                    setReasonError(undefined);
                    rejectModal.current?.open();
                  },
                },
              ]
            : undefined
        }
        columns={[
          {
            header: "Reference",
            accessor: "reference",
            render: (v) => <span className="font-mono text-sm">{String(v)}</span>,
          },
          { header: "Merchant", accessor: "merchantName" },
          {
            header: "Amount",
            accessor: "amountKobo",
            render: (v) => <span className="tnum">{formatNaira(Number(v), { exact: true })}</span>,
          },
          { header: "Status", accessor: "status", render: (v) => <Badge type="PAYOUT_STATUS">{String(v)}</Badge> },
          { header: "Requested", accessor: "createdAt", render: (v) => formatDateTime(String(v)) },
          { header: "Completed", accessor: "processedAt", render: (v) => formatDateTime(v as string | null) },
        ]}
      />
    </div>
  );
}

export default function AdminPayoutsPage() {
  return (
    <Suspense>
      <PayoutsView />
    </Suspense>
  );
}
