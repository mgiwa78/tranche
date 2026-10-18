# Tranche web

One Next.js app, three audiences:

| Route group | Who | What |
|---|---|---|
| `app/(marketing)` → `/`, `/privacy`, `/terms` | Everyone | Landing page (schedule example computed with the shared `buildInstallmentSchedule`) |
| `app/(protected)/merchant/*` | Merchants | Dashboard (balance from the ledger, sales chart), orders with installment timelines, outstanding balances, products, payouts, settlement settings |
| `app/(protected)/admin/*` | Tranche staff | Overview, orders, payout review, merchants, customers, ledger (journal, accounts, trial balance), webhook log + replay, audit log, platform settings |
| `app/auth/*` | | Sign in, merchant sign-up |

## Conventions

- **Data:** Redux Toolkit + RTK Query.
  - One `createApi` per api area (`authApi`, `merchantApi`, `adminApi`), with endpoints injected from per-area files and registered by side-effect import.
  - `store/rtk/base-query.ts` attaches the bearer token and does a single-flight refresh on 401.
  - `errorMiddleware` turns every failed request into a toast.
- **Types and validation:** from `@tranche/shared`. Forms call `validateWith(schema, input)` on the same Zod schemas the api uses.
- **UI:** a hand-built kit in `components/ui` (`DynamicTable`, `Modal`, `StatGrid`, `LineChart`, `Badge`, …) on Tailwind v4 `@theme` tokens in `app/globals.css`. Light and dark themes come from one token set.
- **Access:** gated client-side with `RoleGuard` (role) and `RequireRole` (staff tier), because tokens live in localStorage. The api enforces the same rules.

## Run

```bash
cp web/.env.example web/.env.local     # NEXT_PUBLIC_API_URL
pnpm --filter web dev                  # http://localhost:3000
```

Deploys to Vercel (project root `web`); `NEXT_OUTPUT=standalone` builds the self-contained server used by `web/Dockerfile`.
