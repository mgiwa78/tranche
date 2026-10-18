"use client";

import { useState } from "react";
import Link from "next/link";
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
          <div className="mb-10 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/payouts?status=requested"
              className="focus-ring group flex items-center gap-4 rounded-surface border border-border px-5 py-4 transition-colors hover:border-border-strong"
            >
              <span
                aria-hidden="true"
                className={["h-8 w-1 rounded-full", pending ? "bg-accent" : "bg-border-strong"].join(" ")}
              />
              <span className="flex-1 text-sm font-medium text-ink">
                {pending ? `${pending} payout${pending === 1 ? "" : "s"} waiting for review` : "No payouts waiting"}
              </span>
              <span className="text-sm text-muted transition-colors group-hover:text-accent-ink">Review</span>
            </Link>
            <Link
              href="/admin/ledger"
              className="focus-ring group flex items-center gap-4 rounded-surface border border-border px-5 py-4 transition-colors hover:border-border-strong"
            >
              <span
                aria-hidden="true"
                className={[
                  "h-8 w-1 rounded-full",
                  trial ? (trial.balanced ? "bg-success" : "bg-danger") : "bg-border-strong",
                ].join(" ")}
              />
              <span className="flex-1 text-sm">
                <span className="block font-medium text-ink">
                  {trial ? (trial.balanced ? "Books balance" : "Ledger needs attention") : "Checking the ledger…"}
                </span>
                {trial && (
                  <span className="block text-xs text-muted">
                    {formatNaira(trial.totalDebitKobo)} debits = {formatNaira(trial.totalCreditKobo)} credits
                  </span>
                )}
              </span>
              <span className="text-sm text-muted transition-colors group-hover:text-accent-ink">Ledger</span>
            </Link>
          </div>

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
