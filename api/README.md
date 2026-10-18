# Tranche api

NestJS 11 payments engine: auth and roles, catalog, checkout, installments, a double-entry ledger, Paystack collections and transfers, webhooks, and BullMQ jobs.

## Layout

```
src/
  main.ts / app.module.ts / app.setup.ts   bootstrap (shared with the test harness)
  config/          zod-validated env (Config) + TypeORM DataSource
  common/          auth (RS256 JwtService), guards (JwtAuthGuard, RolesGuard), decorators,
                   errors + AllExceptionsFilter, ZodValidationPipe, ResponseInterceptor,
                   Redis client, rate limiter, logger, audit + health monitors, crypto
  repository/      BaseRepository (findPaginated, Redis read-through cache) + entity repositories
  core/
    ledger/        chart of accounts, posting recipes, LedgerService (idempotent, row-locked)
    payments/      PaymentProvider interface, PaystackProvider, FakePaymentProvider
    billing/       CollectionService (collect + settle), PayoutService, WebhookService,
                   ReminderService, DelinquencyService, AutoChargeService, presenters
    push/          ExpoPushProvider
  queue/           BullMQ queues, processors, job schedulers, QueueService
  modules/
    global/        /auth, /health, /app-config, /notifications, /webhooks, /payments/return
    customer/      /customer/*  (mobile app)
    merchant/      /merchant/*  (merchant dashboard)
    admin/         /admin/*     (staff console)
  database/        entities, migrations, seeders
test/integration/  Nest app + Supertest against real Postgres + Redis
```

## Endpoints (prefix `/api/v1`)

| Area | Routes |
|---|---|
| Auth | `POST /auth/register`, `/auth/register/merchant`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`; `GET`/`PATCH /auth/me` |
| Public | `GET /health`, `/app-config`; `POST /webhooks/paystack`; `GET /payments/return` |
| Any user | `GET /notifications`, `POST /notifications/read-all`, `POST`/`DELETE /notifications/device-tokens` |
| Shopper | `GET /customer/products`, `/products/:id`, `/stores`, `/summary`, `/orders`, `/orders/:id`, `/payments`, `/payments/verify/:reference`, `/payment-methods`; `POST /customer/checkout`, `/installments/:id/pay`; `PATCH`/`DELETE /payment-methods/:id` |
| Merchant | `GET /merchant/dashboard`, `/orders`, `/orders/:id`, `/outstanding`, `/balance`, `/payouts`, `/profile`; `POST /merchant/payouts`; products CRUD under `/merchant/products` |
| Staff | `GET /admin/dashboard`, `/merchants`, `/customers`, `/orders`, `/payouts`, `/ledger/accounts`, `/ledger/transactions`, `/ledger/trial-balance`, `/webhooks`, `/audit-logs`, `/settings`; mutations gated by staff tier (`support` < `admin` < `super_admin`) |

Every response is `{ success: true, response, message? }`. Every error is `{ success: false, error: { message, code, details? }, timestamp, requestId }`.

## Scripts

| | |
|---|---|
| `pnpm dev` | watch mode |
| `pnpm build` / `pnpm start` | `nest build` + `tsc-alias`, then `node dist/main.js` |
| `pnpm db:migrate` / `db:revert` / `db:generate` / `db:check` | TypeORM CLI on the TS sources (`db:check` fails if entities and migrations drift) |
| `pnpm seed` | reset + full demo data (`SEED_RESET=false` for essentials only) |
| `pnpm keys:generate` | RS256 keypair + encryption key for `.env` |
| `pnpm test` / `test:int` / `test:all` | unit / integration / both with coverage |

## Jobs (BullMQ)

| Queue | Schedule (Africa/Lagos) | Does |
|---|---|---|
| `reminders` | `0 8 * * *` | due-in-3-days, due-today and overdue reminders (push + inbox), each sent once |
| `installment-charges` | `0 * * * *` | finds due installments and fans out one charge job each (saved card) |
| `maintenance` | `30 0 * * *` | marks overdue, applies late fees after grace, defaults at 60 days, cancels stale checkouts |
| `webhooks` | on demand | processes stored Paystack events with retries |
| `payouts` | on demand | Paystack transfer after a payout is approved |

Schedules are BullMQ job schedulers (stored in Redis), so running several api instances still runs each tick once.
