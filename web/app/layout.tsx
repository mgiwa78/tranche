import type { Metadata } from "next";
import { Toaster } from "sonner";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tranche - Buy now, pay in parts", template: "%s | Tranche" },
  description:
    "Interest-free installments for shoppers in Nigeria, paid upfront for merchants. Split any purchase into 4 payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <StoreProvider>
          <Toaster position="top-right" closeButton richColors duration={5000} />
          <ConfirmProvider>{children}</ConfirmProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
