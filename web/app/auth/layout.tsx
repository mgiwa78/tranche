import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="focus-ring mb-12 inline-block rounded-control">
          <Logo tagline />
        </Link>
        {children}
      </div>
    </main>
  );
}
