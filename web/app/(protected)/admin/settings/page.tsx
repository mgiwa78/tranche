"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminRole,
  PLAN_LIST,
  PlanCode,
  fromKobo,
  hasAdminRole,
  toKobo,
  updatePlatformSettingsSchema,
  validateWith,
  type PlatformSettingsDTO,
} from "@tranche/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppSelector } from "@/store/hooks";
import { selectAdminRole } from "@/store/selectors/authSelectors";
import { useGetPlatformSettingsQuery, useUpdatePlatformSettingsMutation } from "@/store/rtk/adminSlice/adminSlices";

/** Form state in human units (percent, naira); converted to bps/kobo for the shared schema. */
interface Draft {
  merchantFeePercent: string;
  lateFeeNaira: string;
  graceDays: string;
  reminderDaysBefore: string;
  defaultCreditLimitNaira: string;
  maxChargeAttempts: string;
  enabledPlans: PlanCode[];
  maintenanceMode: boolean;
}

const toDraft = (s: PlatformSettingsDTO): Draft => ({
  merchantFeePercent: String(s.merchantFeeBps / 100),
  lateFeeNaira: String(fromKobo(s.lateFeeKobo)),
  graceDays: String(s.graceDays),
  reminderDaysBefore: String(s.reminderDaysBefore),
  defaultCreditLimitNaira: String(fromKobo(s.defaultCreditLimitKobo)),
  maxChargeAttempts: String(s.maxChargeAttempts),
  enabledPlans: s.enabledPlans,
  maintenanceMode: s.maintenanceMode,
});

const fromDraft = (d: Draft): PlatformSettingsDTO => ({
  merchantFeeBps: Math.round(Number(d.merchantFeePercent) * 100),
  lateFeeKobo: toKobo(Number(d.lateFeeNaira)),
  graceDays: Number(d.graceDays),
  reminderDaysBefore: Number(d.reminderDaysBefore),
  defaultCreditLimitKobo: toKobo(Number(d.defaultCreditLimitNaira)),
  maxChargeAttempts: Number(d.maxChargeAttempts),
  enabledPlans: d.enabledPlans,
  maintenanceMode: d.maintenanceMode,
});

export default function AdminSettingsPage() {
  const role = useAppSelector(selectAdminRole);
  const editable = hasAdminRole(role, AdminRole.SUPER_ADMIN);
  const { data } = useGetPlatformSettingsQuery();
  const [save, { isLoading }] = useUpdatePlatformSettingsMutation();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setDraft(toDraft(data));
  }, [data]);

  const changedKeys = useMemo(() => {
    if (!data || !draft) return [];
    const next = fromDraft(draft);
    return (Object.keys(next) as (keyof PlatformSettingsDTO)[]).filter(
      (k) => JSON.stringify(next[k]) !== JSON.stringify(data[k]),
    );
  }, [data, draft]);

  if (!draft) return <p className="text-sm text-muted">Loading…</p>;

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => (d ? { ...d, [key]: e.target.value } : d));

  async function submit() {
    if (!draft) return;
    const next = fromDraft(draft);
    const patch = Object.fromEntries(changedKeys.map((k) => [k, next[k]]));
    const result = validateWith(updatePlatformSettingsSchema, patch);
    if (!result.ok) return setErrors(result.errors as Record<string, string>);
    setErrors({});
    try {
      await save(result.data).unwrap();
      toast.success("Settings saved");
    } catch {
      /* toasted */
    }
  }

  const togglePlan = (code: PlanCode) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            enabledPlans: d.enabledPlans.includes(code)
              ? d.enabledPlans.filter((p) => p !== code)
              : [...d.enabledPlans, code],
          }
        : d,
    );

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle={
          editable
            ? "Platform rules. Changes apply to new orders and the next scheduled jobs."
            : "Only super admins can change these."
        }
      />
      <fieldset disabled={!editable} className="contents">
        <Section title="Pricing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="fee"
              label="Default merchant fee (%)"
              inputMode="decimal"
              value={draft.merchantFeePercent}
              onChange={set("merchantFeePercent")}
              error={errors.merchantFeeBps}
            />
            <Input
              id="limit"
              label="New shopper credit limit (₦)"
              inputMode="decimal"
              value={draft.defaultCreditLimitNaira}
              onChange={set("defaultCreditLimitNaira")}
              error={errors.defaultCreditLimitKobo}
            />
          </div>
        </Section>

        <Section title="Collections">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="late"
              label="Late fee (₦)"
              inputMode="decimal"
              value={draft.lateFeeNaira}
              onChange={set("lateFeeNaira")}
              error={errors.lateFeeKobo}
            />
            <Input
              id="grace"
              label="Grace days before late fee"
              inputMode="numeric"
              value={draft.graceDays}
              onChange={set("graceDays")}
              error={errors.graceDays}
            />
            <Input
              id="remind"
              label="Reminder days before due"
              inputMode="numeric"
              value={draft.reminderDaysBefore}
              onChange={set("reminderDaysBefore")}
              error={errors.reminderDaysBefore}
            />
            <Input
              id="attempts"
              label="Max auto-charge attempts"
              inputMode="numeric"
              value={draft.maxChargeAttempts}
              onChange={set("maxChargeAttempts")}
              error={errors.maxChargeAttempts}
            />
          </div>
        </Section>

        <Section title="Plans offered">
          <div className="flex flex-col gap-2">
            {PLAN_LIST.map((plan) => (
              <label key={plan.code} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.enabledPlans.includes(plan.code)}
                  onChange={() => togglePlan(plan.code)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-ink">{plan.label}</span>
                <span className="text-muted">{plan.description}</span>
              </label>
            ))}
            {errors.enabledPlans && <p className="text-xs text-danger">{errors.enabledPlans}</p>}
          </div>
        </Section>

        <Section title="Maintenance">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={draft.maintenanceMode}
              onChange={(e) => setDraft((d) => (d ? { ...d, maintenanceMode: e.target.checked } : d))}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-ink">Pause the shopper app</span>
            <span className="text-muted">Checkout and payments return 503; staff tools keep working.</span>
          </label>
        </Section>
      </fieldset>

      {editable && (
        <div className="flex items-center gap-3">
          <Button onClick={submit} loading={isLoading} disabled={changedKeys.length === 0}>
            Save changes
          </Button>
          {changedKeys.length > 0 && <span className="text-sm text-muted">{changedKeys.length} unsaved change(s)</span>}
        </div>
      )}
    </div>
  );
}
