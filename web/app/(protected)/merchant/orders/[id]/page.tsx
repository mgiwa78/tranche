"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { OrderDetailPanel } from "@/components/orders/OrderDetailPanel";
import { useGetMerchantOrderQuery } from "@/store/rtk/merchantSlice/merchantSlices";

export default function MerchantOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useGetMerchantOrderQuery(id);

  return (
    <div>
      <PageHeader
        title={data ? `Order ${data.reference}` : "Order"}
        leading={
          <Link href="/merchant/orders" className="text-sm text-muted hover:text-ink">
            ← Orders
          </Link>
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
