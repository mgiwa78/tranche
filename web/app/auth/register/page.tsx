"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registerMerchantSchema, validateWith, type RegisterMerchantDTO } from "@tranche/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppDispatch } from "@/store/hooks";
import { setSession } from "@/store/slices/authSlice";
import { useRegisterMerchantMutation } from "@/store/rtk/authSlice/auth.slice";

type Draft = Record<keyof RegisterMerchantDTO, string>;
const EMPTY: Draft = { businessName: "", firstName: "", lastName: "", email: "", phone: "", password: "" };

export default function RegisterMerchantPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMerchantMutation();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const field = (name: keyof Draft) => ({
    id: name,
    name,
    value: draft[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [name]: e.target.value })),
    error: errors[name],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateWith(registerMerchantSchema, { ...draft, phone: draft.phone || undefined });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    try {
      const res = await register(result.data).unwrap();
      dispatch(setSession(res));
      toast.success("Store created. We'll review it shortly; you can add products now.");
      router.replace("/merchant/dashboard");
    } catch {
      /* toasted by errorMiddleware */
    }
  }

  return (
    <div>
      <h1 className="font-brand text-3xl font-semibold tracking-[-0.03em] text-ink">Create a merchant account</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Get paid in full upfront. Your customers pay Tranche in four.</p>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Input label="Business name" autoFocus {...field("businessName")} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" autoComplete="given-name" {...field("firstName")} />
          <Input label="Last name" autoComplete="family-name" {...field("lastName")} />
        </div>
        <Input label="Work email" type="email" autoComplete="email" {...field("email")} />
        <Input label="Phone" type="tel" autoComplete="tel" hint="Optional" {...field("phone")} />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters with a letter and a number"
          {...field("password")}
        />
        <Button type="submit" loading={isLoading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 border-t border-border pt-5 text-sm text-muted">
        Already selling with Tranche?{" "}
        <Link href="/auth/login" className="focus-ring rounded-control font-medium text-accent-ink hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
