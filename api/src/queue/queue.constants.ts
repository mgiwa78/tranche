export const QUEUES = {
  REMINDERS: "reminders",
  CHARGES: "installment-charges",
  MAINTENANCE: "maintenance",
  WEBHOOKS: "webhooks",
  PAYOUTS: "payouts",
} as const;

export const JOBS = {
  SEND_REMINDERS: "send-reminders",
  SCAN_DUE: "scan-due",
  CHARGE_INSTALLMENT: "charge-installment",
  DELINQUENCY_SWEEP: "delinquency-sweep",
  PROCESS_WEBHOOK: "process-webhook",
  EXECUTE_TRANSFER: "execute-transfer",
} as const;

export const ALL_QUEUES = Object.values(QUEUES);
