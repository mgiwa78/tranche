import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-muted sm:px-8">
      <h1 className="font-brand mb-6 text-3xl font-medium tracking-tight text-ink">Terms</h1>
      <p className="mb-4">
        When you check out with Tranche, you agree to pay the installments shown at checkout on their due dates. We
        charge your saved card automatically on each due date and remind you beforehand.
      </p>
      <p className="mb-4">
        Installments are interest-free. A flat late fee applies once per installment that is more than the grace period
        late. You can pay any installment early from the app.
      </p>
      <p>This is a demonstration product running in Paystack test mode; no real money moves.</p>
    </main>
  );
}
