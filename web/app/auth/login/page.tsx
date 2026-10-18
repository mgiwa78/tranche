"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import { toast } from "sonner";
import { UserRole, loginSchema, validateWith, type LoginDTO } from "@tranche/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSession } from "@/store/slices/authSlice";
import { homeFor, selectAuthHydrated, selectCurrentUser } from "@/store/selectors/authSelectors";
import { useLoginMutation } from "@/store/rtk/authSlice/auth.slice";

const DEMO_ACCOUNTS = [
  { label: "Merchant", email: "merchant@tranche.ng" },
  { label: "Admin", email: "admin@tranche.ng" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const dispatch = useAppDispatch();
  const hydrated = useAppSelector(selectAuthHydrated);
  const current = useAppSelector(selectCurrentUser);
  const [login, { isLoading }] = useLoginMutation();
  const next = params.get("next");

  useEffect(() => {
    if (hydrated && current) router.replace(homeFor(current.role));
  }, [hydrated, current, router]);

  const formik = useFormik<LoginDTO>({
    initialValues: { email: "", password: "" },
    // Same schema the api validates with.
    validate: (values) => {
      const result = validateWith(loginSchema, values);
      return result.ok ? {} : result.errors;
    },
    onSubmit: async (values) => {
      try {
        const res = await login(values).unwrap();
        if (res.user.role === UserRole.CUSTOMER) {
          toast.error("Shopper accounts use the Tranche mobile app.");
          return;
        }
        dispatch(setSession(res));
        const home = homeFor(res.user.role);
        router.replace(next && next.startsWith(home.split("/").slice(0, 2).join("/")) ? next : home);
      } catch {
        // errorMiddleware already toasts the API error
      }
    },
  });

  const reason = params.get("reason");
  useEffect(() => {
    if (reason === "session_timeout") toast.message("Your session expired. Please sign in again.");
  }, [reason]);

  return (
    <form onSubmit={formik.handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        autoFocus
        placeholder="you@store.ng"
        value={formik.values.email}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.email ? formik.errors.email : undefined}
      />
      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.password ? formik.errors.password : undefined}
      />
      <Button type="submit" loading={isLoading}>
        Sign in
      </Button>
      {process.env.NODE_ENV !== "production" && (
        <div className="rounded-surface border border-border px-4 py-3 text-xs text-muted">
          <p className="mb-2 text-faint">Seeded demo accounts (password Tranche123!)</p>
          <div className="flex gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                className="press focus-ring rounded-control border border-border px-2 py-1 text-ink hover:bg-canvas-subtle"
                onClick={() => formik.setValues({ email: a.email, password: "Tranche123!" })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-brand text-2xl font-medium tracking-tight text-ink">Sign in</h1>
      <p className="mb-6 mt-1 text-sm text-muted">For merchants and Tranche staff.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-sm text-muted">
        Selling online?{" "}
        <Link href="/auth/register" className="focus-ring rounded-control font-medium text-accent-ink hover:underline">
          Offer Tranche at checkout
        </Link>
      </p>
    </div>
  );
}
