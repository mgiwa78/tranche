import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { formatNaira } from "@tranche/shared";
import { Config } from "@/config";
import { Logger } from "@/common/logger";

const layout = (title: string, body: string) => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0D0D0D">
    <div style="font-weight:600;font-size:20px;letter-spacing:-0.01em;margin-bottom:24px">Tranche</div>
    <h1 style="font-size:22px;font-weight:600;margin:0 0 12px">${title}</h1>
    ${body}
    <p style="color:#6b7280;font-size:12px;margin-top:32px">You're receiving this because you have a Tranche account.</p>
  </div>`;

/** Resend with inline HTML. Without RESEND_API_KEY it only logs. */
@Injectable()
export class EmailService {
  private resend: Resend | null = Config.resend.apiKey ? new Resend(Config.resend.apiKey) : null;
  private logger = new Logger({ level: Config.logging.level, service: "email-service" });

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.debug("Email skipped (RESEND_API_KEY not set)", { to, subject });
      return;
    }
    try {
      const { error } = await this.resend.emails.send({ from: Config.email.from, to, subject, html });
      if (error) this.logger.warn("Resend rejected email", { to, subject, error: error.message });
    } catch (error) {
      this.logger.error("Failed to send email", error as Error, { to, subject });
    }
  }

  sendWelcome(to: string, firstName: string) {
    return this.send(
      to,
      "Welcome to Tranche",
      layout(
        `Welcome, ${firstName}`,
        `<p style="line-height:1.6">Shop now and split the cost into interest-free installments. We'll remind you before every payment is due.</p>`,
      ),
    );
  }

  sendPaymentReceipt(to: string, p: { amountKobo: number; orderReference: string; remaining: number }) {
    return this.send(
      to,
      `Payment received - ${formatNaira(p.amountKobo)}`,
      layout(
        "Payment received",
        `<p style="line-height:1.6">We received <strong>${formatNaira(p.amountKobo)}</strong> for order ${p.orderReference}.</p>
         <p style="line-height:1.6">${p.remaining === 0 ? "That was your last payment. It's all yours." : `${p.remaining} payment${p.remaining === 1 ? "" : "s"} left.`}</p>`,
      ),
    );
  }
}
