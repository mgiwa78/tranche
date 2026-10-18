import Link from "next/link";
import { PlanCode, buildInstallmentSchedule, formatNaira, toKobo } from "@tranche/shared";
import { LogoMark } from "@/components/brand/Logo";

const APP_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "https://expo.dev";

const EXAMPLE_PRICE = toKobo(420_000);
// The same function the api uses to create the schedule and the app uses to preview it.
const EXAMPLE = buildInstallmentSchedule(EXAMPLE_PRICE, PlanCode.PAY_IN_4, "2026-11-01");
const DUE_LABELS = ["Today", "In 2 weeks", "In 4 weeks", "In 6 weeks"];

const STEPS = [
  {
    n: "1",
    title: "Pick Tranche at checkout",
    body: "Choose Pay in 4, or spread it over 3 or 6 months. You see every date and amount before you commit.",
  },
  {
    n: "2",
    title: "Pay the first part today",
    body: "Pay a quarter now with your card. Your order ships straight away; the store is paid in full.",
  },
  {
    n: "3",
    title: "The rest, automatically",
    body: "We remind you 3 days before each payment and charge your saved card on the day. Pay early anytime.",
  },
];

const FAQ = [
  {
    q: "Is there interest?",
    a: "No. Tranche is interest-free for shoppers. If a payment is more than 3 days late, a flat late fee applies once per installment; you see it in the app before it happens.",
  },
  {
    q: "How much can I spend?",
    a: "Every account has a spending limit. Only the part you haven't paid yet counts against it, so your limit frees up as you pay.",
  },
  {
    q: "What happens if a card payment fails?",
    a: "We tell you straight away and retry over the next few days. You can pay from the app at any time with a different card.",
  },
  {
    q: "When do merchants get paid?",
    a: "As soon as the shopper's first installment clears, the full order amount (less the Tranche fee) is available to withdraw. Tranche carries the repayment risk.",
  },
];

function PhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="rounded-[36px] border border-border-strong bg-surface p-3 shadow-lg">
        <div className="rounded-[26px] bg-canvas px-5 pb-6 pt-7">
          <p className="text-xs text-faint">Lagos Gadget Hub</p>
          <p className="font-brand mt-1 text-lg font-medium text-ink">Sony WH-1000XM5</p>
          <p className="font-brand mt-4 text-3xl font-medium tracking-tight text-ink">{formatNaira(EXAMPLE_PRICE)}</p>
          <p className="mt-1 text-sm text-muted">or 4 interest-free payments of {formatNaira(EXAMPLE[1].amountKobo)}</p>
          <div className="mt-5 flex gap-1" aria-hidden="true">
            {EXAMPLE.map((s, i) => (
              <span
                key={s.sequence}
                className={["h-1.5 flex-1 rounded-full", i === 0 ? "bg-accent" : "bg-border"].join(" ")}
              />
            ))}
          </div>
          <ol className="mt-5 flex flex-col gap-3">
            {EXAMPLE.map((s, i) => (
              <li key={s.sequence} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={[
                      "h-2.5 w-2.5 rounded-full border-2",
                      i === 0 ? "border-accent bg-accent" : "border-border-strong",
                    ].join(" ")}
                  />
                  <span className={i === 0 ? "font-medium text-ink" : "text-muted"}>{DUE_LABELS[i]}</span>
                </span>
                <span className="tnum text-ink">{formatNaira(s.amountKobo)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-full bg-ink py-3 text-center text-sm font-semibold text-canvas">
            Pay {formatNaira(EXAMPLE[0].amountKobo)} today
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted">
            <LogoMark className="h-3 w-5" /> Interest-free, built for Nigeria
          </p>
          <h1 className="font-brand text-[2.6rem] font-medium leading-[1.05] tracking-[-0.035em] text-ink sm:text-6xl">
            Get it today.
            <br />
            Pay in four.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
            Split any purchase into four payments, two weeks apart. No interest, no paperwork, and a reminder before
            every payment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={APP_URL}
              className="press focus-ring rounded-control bg-accent px-5 py-3 text-sm font-medium text-accent-contrast hover:bg-accent-hover"
            >
              Get the app
            </a>
            <Link
              href="/auth/register"
              className="press focus-ring rounded-control border border-border-strong px-5 py-3 text-sm font-medium text-ink hover:bg-canvas-subtle"
            >
              I run a store
            </Link>
          </div>
        </div>
        <PhonePreview />
      </section>

      <section id="how-it-works" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <h2 className="font-brand max-w-xl text-3xl font-medium tracking-tight text-ink">
            Three steps, and you always know what&apos;s next.
          </h2>
          <div className="ledger mt-10 grid-cols-1 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="p-6">
                <span className="font-brand text-sm text-accent">{s.n}</span>
                <h3 className="mt-3 text-base font-medium text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="merchants" className="border-t border-border bg-canvas-subtle">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="font-brand text-3xl font-medium tracking-tight text-ink">Paid in full. Upfront.</h2>
            <p className="mt-4 max-w-md text-muted">
              Offer installments without carrying the risk. Tranche pays you the whole order when the first payment
              clears, then collects from the shopper.
            </p>
            <Link href="/auth/register" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
              Create a merchant account →
            </Link>
          </div>
          <dl className="ledger grid-cols-2">
            {[
              ["Upfront", "Full order value, less our fee, ready to withdraw"],
              ["Zero risk", "Missed payments are our problem, not yours"],
              ["Live dashboard", "Orders, outstanding balances and payouts"],
              ["Bigger baskets", "Shoppers buy more when it's split in four"],
            ].map(([t, d]) => (
              <div key={t} className="p-5">
                <dt className="text-sm font-medium text-ink">{t}</dt>
                <dd className="mt-1 text-sm text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="fees" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <h2 className="font-brand text-3xl font-medium tracking-tight text-ink">Simple pricing</h2>
          <div className="ledger mt-10 grid-cols-1 md:grid-cols-2">
            <div className="p-6">
              <p className="text-sm text-muted">Shoppers</p>
              <p className="font-brand mt-2 text-4xl font-medium text-ink">₦0 interest</p>
              <p className="mt-3 text-sm text-muted">
                A flat {formatNaira(toKobo(1_000))} late fee only if a payment is more than 3 days late.
              </p>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted">Merchants</p>
              <p className="font-brand mt-2 text-4xl font-medium text-ink">4.5% per order</p>
              <p className="mt-3 text-sm text-muted">No setup or monthly fees. Payouts to any Nigerian bank account.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-8">
          <h2 className="font-brand text-3xl font-medium tracking-tight text-ink">Questions</h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-ink">
                  <span className="font-medium">{f.q}</span>
                  <span aria-hidden="true" className="text-faint transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-navy">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:flex-row sm:items-center sm:px-8">
          <h2 className="font-brand text-3xl font-medium tracking-tight text-white">Your next purchase, in four.</h2>
          <a
            href={APP_URL}
            className="press focus-ring rounded-control bg-white px-5 py-3 text-sm font-medium text-[#0A1B3D] hover:bg-white/90"
          >
            Get the app
          </a>
        </div>
      </section>
    </main>
  );
}
