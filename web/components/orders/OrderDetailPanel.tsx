"use client";

import { InstallmentStatus, PLAN_LABELS } from "@/constants/enums";
import { Badge } from "@/components/ui/Badge";
import { DynamicView } from "@/components/ui/DynamicView";
import { formatDate, formatDateTime, formatNaira } from "@/helpers/helpers";
import type { InstallmentView, OrderDetailView } from "@/types/global";

const DOT: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PAID]: "bg-success border-success",
  [InstallmentStatus.PENDING]: "bg-canvas border-border-strong",
  [InstallmentStatus.FAILED]: "bg-danger border-danger",
  [InstallmentStatus.OVERDUE]: "bg-warning border-warning",
  [InstallmentStatus.CANCELLED]: "bg-canvas border-border",
};

/** The schedule as a horizontal track: one segment per installment, filled as they're paid. */
export function InstallmentTrack({ installments }: { installments: InstallmentView[] }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {installments.map((i) => (
        <span
          key={i.id}
          className={[
            "h-1.5 flex-1 rounded-full",
            i.status === InstallmentStatus.PAID
              ? "bg-accent"
              : i.status === InstallmentStatus.OVERDUE || i.status === InstallmentStatus.FAILED
                ? "bg-warning"
                : "bg-border",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export function InstallmentTimeline({ installments }: { installments: InstallmentView[] }) {
  return (
    <ol className="relative">
      {installments.map((i, index) => (
        <li key={i.id} className="relative flex gap-4 pb-5 last:pb-0">
          {index < installments.length - 1 && (
            <span aria-hidden="true" className="absolute left-[5px] top-4 h-[calc(100%-8px)] w-px bg-border" />
          )}
          <span
            aria-hidden="true"
            className={["mt-1.5 h-[11px] w-[11px] flex-shrink-0 rounded-full border-2", DOT[i.status]].join(" ")}
          />
          <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <p className="text-sm font-medium text-ink">
                Payment {i.sequence} <span className="font-normal text-muted">· due {formatDate(i.dueDate)}</span>
              </p>
              <p className="text-xs text-faint">
                {i.paidAt
                  ? `Paid ${formatDateTime(i.paidAt)}`
                  : i.attemptCount
                    ? `${i.attemptCount} charge attempt(s)`
                    : " "}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="tnum text-sm text-ink">{formatNaira(i.amountKobo, { exact: true })}</span>
              <Badge type="INSTALLMENT_STATUS">{i.status}</Badge>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-faint">{title}</h2>
      {children}
    </section>
  );
}

/** Order summary, schedule, items and payment history. Merchant and admin pages share it. */
export function OrderDetailPanel({ order, showFee = true }: { order: OrderDetailView; showFee?: boolean }) {
  const progress = order.installmentCount ? order.installmentsPaid / order.installmentCount : 0;
  return (
    <div>
      <div className="mb-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="font-brand text-3xl font-medium tracking-tight text-ink">{formatNaira(order.totalKobo)}</p>
            <Badge type="ORDER_STATUS">{order.status}</Badge>
          </div>
          <InstallmentTrack installments={order.installments} />
          <p className="mt-2 text-xs text-muted">
            {order.installmentsPaid} of {order.installmentCount} paid · {formatNaira(order.paidKobo)} collected ·{" "}
            {formatNaira(order.outstandingKobo)} outstanding ({Math.round(progress * 100)}%)
          </p>
        </div>
        <DynamicView
          sections={[
            {
              title: "Order",
              fields: [
                { label: "Reference", value: <span className="font-mono">{order.reference}</span> },
                { label: "Plan", value: PLAN_LABELS[order.planCode] },
                { label: "Shopper", value: order.customerName ?? "—" },
                { label: "Store", value: order.merchantName ?? "—" },
                ...(showFee ? [{ label: "Merchant fee", value: formatNaira(order.feeKobo, { exact: true }) }] : []),
                { label: "Placed", value: formatDateTime(order.createdAt) },
              ],
            },
          ]}
        />
      </div>

      <Section title="Schedule">
        <InstallmentTimeline installments={order.installments} />
      </Section>

      <Section title="Items">
        <ul className="divide-y divide-border border-y border-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-control object-cover" />
              ) : (
                <span className="h-10 w-10 rounded-control bg-canvas-subtle" />
              )}
              <span className="flex-1 text-sm text-ink">
                {item.name} <span className="text-muted">× {item.quantity}</span>
              </span>
              <span className="tnum text-sm text-ink">{formatNaira(item.lineTotalKobo)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Payments">
        {order.payments.length === 0 ? (
          <p className="text-sm text-muted">No payment attempts yet.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {order.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 text-sm">
                <span className="w-44 font-mono text-xs text-muted">{p.reference}</span>
                <span className="flex-1 text-muted">
                  {p.channel === "card_on_file"
                    ? `Saved card${p.cardLast4 ? ` •••• ${p.cardLast4}` : ""}`
                    : "Hosted checkout"}
                  {p.failureReason ? ` · ${p.failureReason}` : ""}
                </span>
                <span className="text-xs text-faint">{formatDateTime(p.paidAt ?? p.createdAt)}</span>
                <span className="tnum w-28 text-right text-ink">{formatNaira(p.amountKobo, { exact: true })}</span>
                <Badge type="PAYMENT_STATUS">{p.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
