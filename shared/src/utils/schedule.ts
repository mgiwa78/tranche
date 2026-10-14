import { PlanCode, PlanInterval } from "../enums/tranche.enums";
import { addDays, addMonths, IsoDateOnly, parseIsoDate, toIsoDate } from "./dates";
import { splitKobo } from "./money";

export interface BnplPlan {
  code: PlanCode;
  label: string;
  description: string;
  installmentCount: number;
  interval: PlanInterval;
}

/**
 * The plans a shopper can pick at checkout. Interest-free for the shopper; Tranche earns
 * the merchant fee (see `platform_settings.merchant_fee_bps`). The first installment is
 * always collected at checkout.
 */
export const BNPL_PLANS: Record<PlanCode, BnplPlan> = {
  [PlanCode.PAY_IN_4]: {
    code: PlanCode.PAY_IN_4,
    label: "Pay in 4",
    description: "4 payments, every 2 weeks",
    installmentCount: 4,
    interval: PlanInterval.BIWEEKLY,
  },
  [PlanCode.MONTHLY_3]: {
    code: PlanCode.MONTHLY_3,
    label: "3 months",
    description: "3 monthly payments",
    installmentCount: 3,
    interval: PlanInterval.MONTHLY,
  },
  [PlanCode.MONTHLY_6]: {
    code: PlanCode.MONTHLY_6,
    label: "6 months",
    description: "6 monthly payments",
    installmentCount: 6,
    interval: PlanInterval.MONTHLY,
  },
};

export const PLAN_LIST: BnplPlan[] = Object.values(BNPL_PLANS);

export interface ScheduledInstallment {
  sequence: number;
  amountKobo: number;
  dueDate: IsoDateOnly;
}

const dueDateFor = (start: Date, interval: PlanInterval, index: number): Date =>
  interval === PlanInterval.BIWEEKLY ? addDays(start, 14 * index) : addMonths(start, index);

/**
 * The one schedule function. The app previews it before checkout, the api persists it,
 * the web dashboard renders it — so all three always agree to the kobo and the day.
 */
export const buildInstallmentSchedule = (
  totalKobo: number,
  planCode: PlanCode,
  startDate: IsoDateOnly | Date,
): ScheduledInstallment[] => {
  const plan = BNPL_PLANS[planCode];
  if (!plan) throw new RangeError(`Unknown plan: ${planCode}`);
  const start = parseIsoDate(startDate);
  return splitKobo(totalKobo, plan.installmentCount).map((amountKobo, index) => ({
    sequence: index + 1,
    amountKobo,
    dueDate: toIsoDate(dueDateFor(start, plan.interval, index)),
  }));
};
