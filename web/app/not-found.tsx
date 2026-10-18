import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-faint">404</p>
      <h1 className="text-xl font-semibold text-ink">Page not found</h1>
      <Link href="/" className="text-sm text-accent hover:underline">
        Back to Tranche
      </Link>
    </div>
  );
}
