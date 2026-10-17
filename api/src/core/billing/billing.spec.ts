import { InstallmentStatus, NotificationType } from "@tranche/shared";
import { Installment } from "@/database/entities";
import { reminderCopy, shouldRemind } from "./reminder.service";
import { maskAccountNumber, summarizeInstallments } from "./presenters";
import { webhookDedupeKey } from "./webhook.service";

const installment = (over: Partial<Installment>): Installment =>
  ({
    id: `i${over.sequence ?? 1}`,
    orderId: "o1",
    sequence: 1,
    amountKobo: 25_000_00,
    lateFeeKobo: 0,
    dueDate: "2026-01-01",
    status: InstallmentStatus.PENDING,
    attemptCount: 0,
    ...over,
  }) as Installment;

describe("summarizeInstallments", () => {
  it("derives paid, outstanding, overdue and the next due installment", () => {
    const s = summarizeInstallments([
      installment({ sequence: 3, dueDate: "2026-01-29" }),
      installment({ sequence: 1, status: InstallmentStatus.PAID }),
      installment({ sequence: 2, status: InstallmentStatus.OVERDUE, lateFeeKobo: 1_000_00, dueDate: "2026-01-15" }),
      installment({ sequence: 4, status: InstallmentStatus.CANCELLED }),
    ]);
    expect(s.paidKobo).toBe(25_000_00);
    expect(s.outstandingKobo).toBe(51_000_00);
    expect(s.overdueKobo).toBe(26_000_00);
    expect(s.installmentsPaid).toBe(1);
    expect(s.next?.sequence).toBe(2);
  });

  it("has no next installment when everything is paid", () => {
    expect(summarizeInstallments([installment({ status: InstallmentStatus.PAID })]).next).toBeNull();
  });
});

describe("shouldRemind", () => {
  const now = new Date("2026-03-10T08:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

  it("sends the first reminder", () => {
    expect(
      shouldRemind({ lastReminderAt: null, lastReminderType: null }, NotificationType.INSTALLMENT_DUE_SOON, now),
    ).toBe(true);
  });

  it("does not repeat the same reminder within a day", () => {
    const sent = { lastReminderAt: hoursAgo(2), lastReminderType: NotificationType.INSTALLMENT_DUE_TODAY };
    expect(shouldRemind(sent, NotificationType.INSTALLMENT_DUE_TODAY, now)).toBe(false);
    expect(shouldRemind({ ...sent, lastReminderAt: hoursAgo(21) }, NotificationType.INSTALLMENT_DUE_TODAY, now)).toBe(
      true,
    );
  });

  it("moves on to a different reminder type immediately", () => {
    const sent = { lastReminderAt: hoursAgo(1), lastReminderType: NotificationType.INSTALLMENT_DUE_SOON };
    expect(shouldRemind(sent, NotificationType.INSTALLMENT_DUE_TODAY, now)).toBe(true);
  });

  it("nudges overdue installments every 3 days", () => {
    const sent = { lastReminderAt: hoursAgo(48), lastReminderType: NotificationType.INSTALLMENT_OVERDUE };
    expect(shouldRemind(sent, NotificationType.INSTALLMENT_OVERDUE, now)).toBe(false);
    expect(shouldRemind({ ...sent, lastReminderAt: hoursAgo(72) }, NotificationType.INSTALLMENT_OVERDUE, now)).toBe(
      true,
    );
  });

  it("writes copy with the amount and store", () => {
    const copy = reminderCopy(NotificationType.INSTALLMENT_DUE_SOON, 25_000_00, "Adire & Co", "2026-03-13");
    expect(copy.title).toBe("Payment coming up");
    expect(copy.body).toContain("25,000");
    expect(copy.body).toContain("Adire & Co");
  });
});

describe("misc", () => {
  it("masks account numbers", () => {
    expect(maskAccountNumber("0123456789")).toBe("******6789");
    expect(maskAccountNumber(null)).toBeNull();
  });

  it("dedupes webhooks by provider, event and reference", () => {
    expect(webhookDedupeKey("paystack", { event: "charge.success", data: { reference: "r1" } })).toBe(
      "paystack:charge.success:r1",
    );
    expect(webhookDedupeKey("paystack", { event: "transfer.success", data: { transfer_code: "TRF_1" } })).toBe(
      "paystack:transfer.success:TRF_1",
    );
  });
});
