"use client";

import { useState } from "react";
import Link from "next/link";
import { MerchantStatus } from "@tranche/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard, StatGrid } from "@/components/ui/Card";
import { LineChart } from "@/components/ui/LineChart";
import { PeriodPicker, Section } from "@/components/ui/Section";
import { formatNaira, formatNairaCompact } from "@/helpers/helpers";
import { useAppSelector } from "@/store/hooks";
import { selectMerchant } from "@/store/selectors/authSelectors";
import { useGetMerchantDashboardQuery } from "@/store/rtk/merchantSlice/merchantSlices";

export default function MerchantDashboardPage() {
  const merchant = useAppSelector(selectMerchant);
  const [days, setDays] = useState(30);
  const { data, isLoading, isError } = useGetMerchantDashboardQuery({ days });

  return (
    <div>
      <PageHeader
        title={merchant ? `Welcome back` : "Dashboard"}
        subtitle="You're paid in full when a shopper's first installment clears. Tranche collects the rest."
        actions={<PeriodPicker value={days} onChange={setDays} />}
      />

      {merchant?.status === MerchantStatus.PENDING && (
        <div className="mb-10 flex items-center gap-4 rounded-surface border border-border px-5 py-4">
          <span aria-hidden="true" className="h-8 w-1 rounded-full bg-warning" />
          <span className="flex-1 text-sm">
            <span className="block font-medium text-ink">Your store is waiting for review</span>
            <span className="block text-muted">
              Add products and settlement details now; shoppers can check out once Tranche approves the store.
            </span>
          </span>
          <Link href="/merchant/settings" className="text-sm text-accent-ink hover:underline">
            Settlement details
          </Link>
        </div>
      )}

      {isError ? (
        <p className="text-sm text-danger">Couldn&apos;t load your dashboard.</p>
      ) : (
        <div className={isLoading ? "animate-pulse" : undefined}>
          <Section title="Balance">
            <StatGrid>
              <StatCard
                label="Available to withdraw"
                value={formatNairaCompact(data?.balance.availableKobo)}
                hint={data ? `${formatNaira(data.balance.pendingPayoutKobo)} in payouts on the way` : undefined}
              />
              <StatCard
                label="Owed by shoppers"
                value={formatNairaCompact(data?.balance.outstandingKobo)}
                hint="Tranche carries this, not you"
              />
              <StatCard label="Lifetime sales" value={formatNairaCompact(data?.balance.lifetimeGmvKobo)} />
              <StatCard label="Paid out" value={formatNairaCompact(data?.balance.lifetimePaidOutKobo)} />
            </StatGrid>
          </Section>

          <Section title={`Last ${days} days`}>
            <StatGrid columns={3} className="mb-6">
              <StatCard
                label="Sales"
                value={formatNairaCompact(data?.periodGmvKobo)}
                hint={`${data?.periodOrders ?? 0} orders`}
              />
              <StatCard label="Average order" value={formatNairaCompact(data?.averageOrderKobo)} />
              <StatCard
                label="Plans running"
                value={String(data?.activeOrders ?? "-")}
                hint={data?.overdueOrders ? `${data.overdueOrders} overdue` : `${data?.completedOrders ?? 0} paid off`}
                tone={data?.overdueOrders ? "warning" : "default"}
              />
            </StatGrid>
            <LineChart
              label="Daily sales"
              format={(v) => formatNaira(v)}
              points={(data?.series ?? []).map((p) => ({ date: p.date, value: p.gmvKobo }))}
            />
          </Section>
        </div>
      )}
    </div>
  );
}
