"use client";

import { useState } from "react";
import { LedgerDirection, LedgerOwnerType, LedgerTransactionKind } from "@tranche/shared";
import { LEDGER_KIND_LABELS } from "@/constants/enums";
import { PageHeader } from "@/components/ui/PageHeader";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { Section } from "@/components/ui/Section";
import { StatCard, StatGrid } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime, formatNaira } from "@/helpers/helpers";
import { useListParams } from "@/hooks/useListParams";
import {
  useGetTrialBalanceQuery,
  useListLedgerAccountsQuery,
  useListLedgerTransactionsQuery,
} from "@/store/rtk/adminSlice/adminSlices";
import type { LedgerAccountView } from "@/types/global";

type AccountRow = LedgerAccountView & Record<string, unknown>;
type Tab = "journal" | "accounts" | "trial";

const TABS: { key: Tab; label: string }[] = [
  { key: "journal", label: "Journal" },
  { key: "accounts", label: "Accounts" },
  { key: "trial", label: "Trial balance" },
];

function Journal() {
  const list = useListParams({ kind: "" });
  const { data, isFetching } = useListLedgerTransactionsQuery(list.query as never);
  return (
    <div>
      <FilterBar
        search={{
          value: list.searchInput,
          placeholder: "Search reference or description…",
          onChange: list.setSearchInput,
        }}
        filters={[
          {
            name: "Kind",
            value: list.params.kind,
            options: [
              { label: "All entries", value: "" },
              ...Object.values(LedgerTransactionKind).map((k) => ({ label: LEDGER_KIND_LABELS[k], value: k })),
            ],
            onChange: (v) => list.setFilter("kind", v),
          },
        ]}
      />
      {isFetching && !data ? (
        <p className="py-8 text-sm text-muted">Loading…</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {(data?.data ?? []).map((t) => (
            <li key={t.id} className="py-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink">
                  {LEDGER_KIND_LABELS[t.kind]} <span className="font-normal text-muted">· {t.description}</span>
                </span>
                <span className="text-xs text-faint">{formatDateTime(t.createdAt)}</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {t.entries.map((e) => (
                    <tr key={e.id}>
                      <td
                        className={[
                          "py-0.5",
                          e.direction === LedgerDirection.CREDIT ? "pl-8 text-muted" : "text-ink",
                        ].join(" ")}
                      >
                        {e.accountName}{" "}
                        <span className="font-mono text-xs text-faint">{e.accountCode.split(":")[0]}</span>
                      </td>
                      <td className="tnum w-36 py-0.5 text-right">
                        {e.direction === LedgerDirection.DEBIT ? formatNaira(e.amountKobo, { exact: true }) : ""}
                      </td>
                      <td className="tnum w-36 py-0.5 text-right text-muted">
                        {e.direction === LedgerDirection.CREDIT ? formatNaira(e.amountKobo, { exact: true }) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Pagination page={list.params.page} totalPages={data?.meta.totalPages ?? 1} onPageChange={list.setPage} />
      </div>
    </div>
  );
}

function Accounts() {
  const list = useListParams({ ownerType: "" });
  const { data, isFetching } = useListLedgerAccountsQuery(list.query as never);
  return (
    <DynamicTable<AccountRow>
      data={(data?.data ?? []) as AccountRow[]}
      isLoading={isFetching && !data}
      rowKey="id"
      search={{ value: list.searchInput, placeholder: "Search accounts…", onChange: list.setSearchInput }}
      filters={[
        {
          name: "Owner",
          value: list.params.ownerType,
          options: [
            { label: "All accounts", value: "" },
            { label: "Platform", value: LedgerOwnerType.PLATFORM },
            { label: "Merchant payables", value: LedgerOwnerType.MERCHANT },
            { label: "Customer receivables", value: LedgerOwnerType.CUSTOMER },
          ],
          onChange: (v) => list.setFilter("ownerType", v),
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
        { header: "Account", accessor: "name" },
        {
          header: "Code",
          accessor: "code",
          render: (v) => <span className="font-mono text-xs text-muted">{String(v)}</span>,
        },
        { header: "Type", accessor: "type", render: (v) => <span className="capitalize">{String(v)}</span> },
        {
          header: "Normal",
          accessor: "normalBalance",
          render: (v) => <span className="capitalize text-muted">{String(v)}</span>,
        },
        {
          header: "Balance",
          accessor: "balanceKobo",
          render: (v) => <span className="tnum">{formatNaira(Number(v), { exact: true })}</span>,
        },
      ]}
    />
  );
}

function TrialBalance() {
  const { data } = useGetTrialBalanceQuery();
  if (!data) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div>
      <StatGrid columns={3} className="mb-8">
        <StatCard label="Total debits" value={formatNaira(data.totalDebitKobo)} />
        <StatCard label="Total credits" value={formatNaira(data.totalCreditKobo)} />
        <StatCard
          label="Status"
          value={data.balanced ? "Balanced" : "Unbalanced"}
          hint={
            data.driftedAccounts.length
              ? `${data.driftedAccounts.length} account(s) drifted`
              : "Recomputed from every entry"
          }
          tone={data.balanced ? "default" : "danger"}
        />
      </StatGrid>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-faint">
            <th className="py-2 font-normal">Account</th>
            <th className="py-2 text-right font-normal">Debit</th>
            <th className="py-2 text-right font-normal">Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.rows.map((r) => (
            <tr key={r.code}>
              <td className="py-2 text-ink">
                {r.name} <span className="font-mono text-xs text-faint">{r.code.split(":")[0]}</span>
              </td>
              <td className="tnum py-2 text-right">{r.debitKobo ? formatNaira(r.debitKobo, { exact: true }) : ""}</td>
              <td className="tnum py-2 text-right">{r.creditKobo ? formatNaira(r.creditKobo, { exact: true }) : ""}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border-strong font-medium">
            <td className="py-2">Total</td>
            <td className="tnum py-2 text-right">{formatNaira(data.totalDebitKobo, { exact: true })}</td>
            <td className="tnum py-2 text-right">{formatNaira(data.totalCreditKobo, { exact: true })}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function AdminLedgerPage() {
  const [tab, setTab] = useState<Tab>("journal");
  return (
    <div>
      <PageHeader
        title="Ledger"
        subtitle="Double-entry books. Every posting balances, and the database refuses any that don't."
      />
      <nav className="mb-6 flex gap-6 border-b border-border" aria-label="Ledger views">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={[
              "focus-ring -mb-px border-b-2 pb-2.5 text-sm transition-colors",
              tab === t.key ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <Section title={TABS.find((t) => t.key === tab)!.label}>
        {tab === "journal" ? <Journal /> : tab === "accounts" ? <Accounts /> : <TrialBalance />}
      </Section>
    </div>
  );
}
