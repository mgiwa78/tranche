"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AdminRole, OrderStatus, hasAdminRole } from "@tranche/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { OrderDetailPanel } from "@/components/orders/OrderDetailPanel";
import { useAppSelector } from "@/store/hooks";
import { selectAdminRole } from "@/store/selectors/authSelectors";
import { useCancelAdminOrderMutation, useGetAdminOrderQuery } from "@/store/rtk/adminSlice/adminSlices";

export default function AdminOrderPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAppSelector(selectAdminRole);
  const confirm = useConfirm();
  const { data, isLoading, isError } = useGetAdminOrderQuery(id);
  const [cancel, { isLoading: cancelling }] = useCancelAdminOrderMutation();

  async function handleCancel() {
    const ok = await confirm({
      title: "Cancel this order?",
      message: "The shopper hasn't paid anything yet, so nothing needs refunding. This can't be undone.",
      confirmLabel: "Cancel order",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await cancel(id).unwrap();
      toast.success("Order cancelled");
    } catch {
      /* toasted */
    }
  }

  return (
    <div>
      <PageHeader
        title={data ? `Order ${data.reference}` : "Order"}
        leading={
          <Link href="/admin/orders" className="text-sm text-muted hover:text-ink">
            ← Orders
          </Link>
        }
        actions={
          data?.status === OrderStatus.PENDING_PAYMENT && hasAdminRole(role, AdminRole.ADMIN) ? (
            <Button variant="destructive" size="sm" loading={cancelling} onClick={handleCancel}>
              Cancel order
            </Button>
          ) : undefined
        }
      />
      {isError ? (
        <p className="text-sm text-danger">This order couldn&apos;t be loaded.</p>
      ) : isLoading || !data ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <OrderDetailPanel order={data} />
      )}
    </div>
  );
}
