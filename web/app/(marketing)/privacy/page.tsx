import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-muted sm:px-8">
      <h1 className="font-brand mb-6 text-3xl font-medium tracking-tight text-ink">Privacy</h1>
      <p className="mb-4">
        Tranche collects what it needs to offer installments: your name, email, phone number, order history and payment
        status. Card details are held by Paystack; we only store a reusable card token, encrypted at rest.
      </p>
      <p className="mb-4">
        We use your data to schedule and collect payments, send reminders and protect against fraud. We never sell it.
        Merchants see your name, email and what you owe on their orders, nothing else.
      </p>
      <p>This is a demonstration product running in Paystack test mode.</p>
    </main>
  );
}
