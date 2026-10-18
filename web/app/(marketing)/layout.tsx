import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#merchants", label: "For merchants" },
  { href: "/#fees", label: "Fees" },
  { href: "/#faq", label: "FAQ" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-border bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Link href="/" className="focus-ring rounded-control" aria-label="Tranche home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="focus-ring rounded-control transition-colors hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="focus-ring rounded-control px-3 py-1.5 text-sm text-muted hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="press focus-ring rounded-control bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover"
            >
              Sell with Tranche
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-[1fr_auto_auto] sm:px-8">
          <div>
            <Logo tagline />
            <p className="mt-4 max-w-xs text-muted">
              Tranche is a demonstration product. Payments run in Paystack test mode; no real money moves.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-muted">
            <span className="text-xs text-faint">Product</span>
            <a href="/#how-it-works" className="hover:text-ink">
              How it works
            </a>
            <a href="/#merchants" className="hover:text-ink">
              For merchants
            </a>
            <Link href="/auth/login" className="hover:text-ink">
              Merchant sign in
            </Link>
          </div>
          <div className="flex flex-col gap-2 text-muted">
            <span className="text-xs text-faint">Legal</span>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
