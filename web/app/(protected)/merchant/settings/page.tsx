"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateMerchantProfileSchema, validateWith } from "@tranche/shared";
import { BANKS } from "@/constants/enums";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DynamicView } from "@/components/ui/DynamicView";
import { Badge } from "@/components/ui/Badge";
import { formatBps, formatDate } from "@/helpers/helpers";
import { useGetMerchantProfileQuery, useUpdateMerchantProfileMutation } from "@/store/rtk/merchantSlice/merchantSlices";

interface Draft {
  name: string;
  supportEmail: string;
  settlementBankCode: string;
  settlementAccountNumber: string;
  settlementAccountName: string;
}

export default function MerchantSettingsPage() {
  const { data: profile } = useGetMerchantProfileQuery();
  const [save, { isLoading }] = useUpdateMerchantProfileMutation();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile && !draft) {
      setDraft({
        name: profile.name,
        supportEmail: profile.supportEmail ?? "",
        settlementBankCode: profile.settlementBankCode ?? "",
        // The api only ever returns the masked number; leave blank to keep it.
        settlementAccountNumber: "",
        settlementAccountName: profile.settlementAccountName ?? "",
      });
    }
  }, [profile, draft]);

  if (!profile || !draft) return <p className="text-sm text-muted">Loading…</p>;

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => (d ? { ...d, [key]: e.target.value } : d));

  async function submit() {
    if (!draft) return;
    const payload = {
      name: draft.name,
      supportEmail: draft.supportEmail || null,
      settlementBankCode: draft.settlementBankCode || null,
      settlementAccountName: draft.settlementAccountName || null,
      ...(draft.settlementAccountNumber ? { settlementAccountNumber: draft.settlementAccountNumber } : {}),
    };
    const result = validateWith(updateMerchantProfileSchema, payload);
    if (!result.ok) return setErrors(result.errors as Record<string, string>);
    setErrors({});
    try {
      await save(result.data).unwrap();
      setDraft((d) => (d ? { ...d, settlementAccountNumber: "" } : d));
      toast.success("Settings saved");
    } catch {
      /* toasted */
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Your store profile and where we send payouts." />

      <Section title="Store">
        <DynamicView
          sections={[
            {
              title: "Account",
              fields: [
                { label: "Status", value: <Badge type="MERCHANT_STATUS">{profile.status}</Badge> },
                { label: "Store link", value: <span className="font-mono">{profile.slug}</span> },
                { label: "Tranche fee", value: `${formatBps(profile.feeBps)} per order` },
                { label: "Joined", value: formatDate(profile.createdAt) },
              ],
            },
          ]}
        />
      </Section>

      <Section title="Profile">
        <div className="flex flex-col gap-4">
          <Input id="m-name" label="Business name" value={draft.name} onChange={set("name")} error={errors.name} />
          <Input
            id="m-support"
            label="Support email"
            type="email"
            hint="Shown to shoppers on their order"
            value={draft.supportEmail}
            onChange={set("supportEmail")}
            error={errors.supportEmail}
          />
        </div>
      </Section>

      <Section title="Settlement account">
        <div className="flex flex-col gap-4">
          <Select
            id="m-bank"
            label="Bank"
            value={draft.settlementBankCode}
            onChange={(v) => setDraft((d) => (d ? { ...d, settlementBankCode: v } : d))}
            options={BANKS.map((b) => ({ label: b.name, value: b.code }))}
            placeholder="Choose your bank"
            error={errors.settlementBankCode}
          />
          <Input
            id="m-account"
            label="Account number"
            inputMode="numeric"
            placeholder={profile.settlementAccountNumber ?? "10 digits"}
            hint={profile.settlementAccountNumber ? "Leave blank to keep the current account" : undefined}
            value={draft.settlementAccountNumber}
            onChange={set("settlementAccountNumber")}
            error={errors.settlementAccountNumber}
          />
          <Input
            id="m-account-name"
            label="Account name"
            value={draft.settlementAccountName}
            onChange={set("settlementAccountName")}
            error={errors.settlementAccountName}
          />
        </div>
      </Section>

      <Button onClick={submit} loading={isLoading}>
        Save changes
      </Button>
    </div>
  );
}
