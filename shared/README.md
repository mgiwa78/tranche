# @tranche/shared

The contract between `api`, `web` and `app`. If it describes data that crosses the wire, it lives here.

| Module | Contents |
|---|---|
| `enums/tranche.enums.ts` | Roles, staff tiers, order/installment/payment/payout/ledger statuses, plan codes, label maps |
| `schemas/*.schema.ts` | Zod schemas (`xxxSchema`) and inferred DTO types (`XxxDTO`). The api validates requests with them; web and app forms validate with the same ones |
| `types/` | `ApiEnvelope`, `ApiErrorEnvelope`, `PaginatedResponse`, and every view the api returns (`OrderView`, `LedgerTransactionView`, …) |
| `utils/money.ts` | Integer-kobo maths: `splitKobo`, `percentOfKobo`, `toKobo`, `formatNaira` |
| `utils/schedule.ts` | `BNPL_PLANS` and `buildInstallmentSchedule`, the one place installment amounts and due dates are computed |
| `utils/validation.ts` | `validateWith(schema, input)`: first message per field, the same shape forms render |

Built with tsup to CJS (NestJS) and ESM (Next.js, Metro) with type declarations. Turborepo builds it before any app (`dependsOn: ["^build"]`).

```bash
pnpm --filter @tranche/shared build
pnpm --filter @tranche/shared test     # schedule, money and schema specs
```
