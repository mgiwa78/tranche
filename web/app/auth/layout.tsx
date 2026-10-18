import Link from "next/link";
import { PlanCode, buildInstallmentSchedule, formatNaira, toKobo } from "@tranche/shared";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const ORDER_TOTAL = toKobo(420_000);
// Same schedule builder the api and the app use, so the panel shows real numbers.
const SCHEDULE = buildInstallmentSchedule(ORDER_TOTAL, PlanCode.PAY_IN_4, "2026-11-01");
const DUE_LABELS = ["Today", "In 2 weeks", "In 4 weeks", "In 6 weeks"];

/** The ink brand panel: stays dark in both themes so the page always has an anchor. */
function BrandPanel() {
  return (
    <aside className="theme-dark relative hidden flex-col justify-between border-r border-border bg-canvas px-10 py-10 text-ink lg:flex xl:px-14">
      <Link href="/" className="focus-ring self-start rounded-control" aria-label="Tranche home">
        <Logo tagline />
      </Link>

      <div className="max-w-md">
        <h2 className="font-brand text-4xl font-semibold leading-[1.05] tracking-[-0.03em] xl:text-5xl">
          Paid in full today.
          <br />
          <span className="text-muted">Your customers pay in four.</span>
        </h2>

        <div className="mt-12">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">Order TR-20418 · Lagos Gadget Hub</span>
            <span className="tnum font-medium">{formatNaira(ORDER_TOTAL)}</span>
          </div>
          <div className="mt-4 flex gap-1" aria-hidden="true">
            {SCHEDULE.map((s, i) => (
              <span
                key={s.sequence}
                className={["h-2 flex-1 rounded-full", i === 0 ? "bg-accent" : "bg-border-strong"].join(" ")}
              />
            ))}
          </div>
          <ol className="mt-5 divide-y divide-border border-y border-border text-sm">
            {SCHEDULE.map((s, i) => (
              <li key={s.sequence} className="flex items-center justify-between py-2.5">
                <span className={i === 0 ? "text-ink" : "text-muted"}>{DUE_LABELS[i]}</span>
                <span className="tnum">{formatNaira(s.amountKobo)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-center gap-2 text-sm text-accent-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            Store settled today, Tranche carries the rest
          </p>
        </div>
      </div>

      <p className="max-w-sm text-xs text-faint">
        Tranche is a demonstration product. Payments run in Paystack test mode; no real money moves.
      </p>
    </aside>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />

      <div className="flex min-h-screen flex-col bg-canvas-subtle">
        <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-border px-6 sm:px-10">
          <Link href="/" className="focus-ring rounded-control lg:hidden" aria-label="Tranche home">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="focus-ring hidden rounded-control px-2 py-1 text-sm text-muted hover:text-ink sm:inline-block"
            >
              Back to site
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-10">
          <div className="w-full max-w-md rounded-surface border border-border bg-surface p-6 shadow-md sm:p-10">
            {children}
          </div>
        </main>

        <footer className="flex flex-shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-6 py-4 text-xs text-faint sm:px-10">
          <span>© {new Date().getFullYear()} Tranche</span>
          <Link href="/privacy" className="focus-ring rounded-control hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="focus-ring rounded-control hover:text-ink">
            Terms
          </Link>
        </footer>
      </div>
    </div>
  );
}
