"use client";

import { useState } from "react";
import { Callout, CalloutRow } from "@/components/ui/Callout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard, StatGrid } from "@/components/ui/Card";
import { LineChart } from "@/components/ui/LineChart";
import { PeriodPicker, Section } from "@/components/ui/Section";
import { formatNaira, formatNairaCompact, formatPercent } from "@/helpers/helpers";
import { useGetAdminDashboardQuery, useGetTrialBalanceQuery } from "@/store/rtk/adminSlice/adminSlices";

export default function AdminDashboardPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError } = useGetAdminDashboardQuery({ days });
  const { data: trial } = useGetTrialBalanceQuery();
  const pending = data?.pendingPayouts ?? 0;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Platform money at a glance. Figures come from the ledger and installments, not caches."
        actions={<PeriodPicker value={days} onChange={setDays} />}
      />

      {isError ? (
        <p className="text-sm text-danger">Couldn&apos;t load dashboard stats.</p>
      ) : (
        <div className={isLoading ? "animate-pulse" : undefined}>
          <CalloutRow columns={2}>
            <Callout
              href="/admin/payouts?status=requested"
              tone={pending ? "accent" : "idle"}
              title={pending ? `${pending} payout${pending === 1 ? "" : "s"} waiting for review` : "No payouts waiting"}
              action="Review"
            />
            <Callout
              href="/admin/ledger"
              tone={trial ? (trial.balanced ? "success" : "danger") : "idle"}
              title={trial ? (trial.balanced ? "Books balance" : "Ledger needs attention") : "Checking the ledger…"}
              detail={
                trial
                  ? `${formatNaira(trial.totalDebitKobo)} debits = ${formatNaira(trial.totalCreditKobo)} credits`
                  : undefined
              }
              action="Ledger"
            />
          </CalloutRow>

          <Section title="Book">
            <StatGrid>
              <StatCard label="Financed, all time" value={formatNairaCompact(data?.gmvKobo)} />
              <StatCard label="Collected" value={formatNairaCompact(data?.collectedKobo)} />
              <StatCard
                label="Outstanding"
                value={formatNairaCompact(data?.outstandingKobo)}
                hint={data?.overdueKobo ? `${formatNaira(data.overdueKobo)} overdue` : undefined}
              />
              <StatCard
                label="Default rate"
                value={data ? formatPercent(data.defaultRate) : "-"}
                tone={data && data.defaultRate > 0.05 ? "danger" : "default"}
              />
            </StatGrid>
          </Section>

          <Section title="Platform">
            <StatGrid>
              <StatCard label="Fee revenue" value={formatNairaCompact(data?.feeRevenueKobo)} />
              <StatCard label="Plans running" value={String(data?.activeOrders ?? "-")} />
              <StatCard label="Shoppers" value={String(data?.customers ?? "-")} />
              <StatCard label="Merchants" value={String(data?.merchants ?? "-")} />
            </StatGrid>
          </Section>

          <Section title={`Last ${days} days`}>
            <div className="grid gap-8 lg:grid-cols-2">
              <LineChart
                label="Financed per day"
                format={(v) => formatNaira(v)}
                points={(data?.series ?? []).map((p) => ({ date: p.date, value: p.gmvKobo }))}
              />
              <LineChart
                label="Collected per day"
                tone="violet"
                format={(v) => formatNaira(v)}
                points={(data?.series ?? []).map((p) => ({ date: p.date, value: p.collectedKobo }))}
              />
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
