# infra

Everything needed to run Tranche outside a laptop's `pnpm dev`.

```
docker/
  docker-compose.yml   Postgres 16 + Redis 7 (always); api, worker, web with --profile app
  init-db.sql          creates tranche and tranche_test
  .env.example         Postgres credentials
env/
  api.docker.env.example   env for the compose api/worker containers
  api.render.env.example   what to set on Render (most is wired by ../render.yaml)
scripts/
  gen-secrets.sh       JWT RS256 keypair (base64 PEM) + encryption key
  backup-db.sh         pg_dump -Fc with 14-day retention
  wait-healthy.sh      polls /api/v1/health after a deploy (used by deploy.yml)
  coverage-summary.js  Jest json-summary -> GitHub job summary table
```

## Local

```bash
pnpm infra:up                     # just Postgres + Redis; run the apps with pnpm dev
pnpm infra:down
```

Whole stack in containers (api seeds demo data on first boot):

```bash
cp infra/env/api.docker.env.example infra/env/api.docker.env
bash infra/scripts/gen-secrets.sh >> infra/env/api.docker.env
docker compose -f infra/docker/docker-compose.yml --profile app up --build
# web http://localhost:3000 · api http://localhost:4000/api/v1/health
```

## Production topology

| Piece | Host | How it ships |
|---|---|---|
| api (HTTP + BullMQ workers) | Render, Docker (`api/Dockerfile`) | `deploy.yml` calls the Render deploy hook after CI passes |
| PostgreSQL 16 | Render managed database | `render.yaml` |
| Redis 7 | Render Key Value, `noeviction` | `render.yaml` |
| web (dashboard + marketing) | Vercel, project root `web` | `deploy.yml` (vercel pull/build/deploy --prebuilt) |
| app | EAS Build | `eas-build.yml` (manual or `app-v*` tag) |

The api image runs `migration:run` before starting. Then it seeds according to `SEED_ON_BOOT`:
- `essentials` (default): platform settings, platform ledger accounts and the super admin
- `demo`: full demo history, only when the database is empty
- `none`: skip seeding

Set `APP_ROLE=worker` on a second service to split HTTP from queue processing. Workers skip migrations.

### First deploy

1. Push the repo to GitHub and create a Blueprint on Render from `render.yaml`.
2. In Render, set `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (from `gen-secrets.sh`) and the Paystack **test** keys.
3. In the Paystack dashboard (test mode), set the webhook URL to `https://<api>/api/v1/webhooks/paystack`.
4. Create a Vercel project with root directory `web` and `NEXT_PUBLIC_API_URL=https://<api>/api/v1`.
5. Add the GitHub secrets listed in the root README; pushes to `main` now deploy after CI.
