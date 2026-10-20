# Godown Ledger

A textile trading ledger for mills, godown stock, udhar bills, recovery, direct mill-to-buyer deals, accounts, returns and the evening note. One mill login opens a locked desk; each person uses a server-verified PIN and role. PostgreSQL is the shared source of truth.

**Client deployment:** [Hostinger deployment guide](docs/HOSTINGER-DEPLOYMENT.md). **Office instructions:** [Client handover](docs/CLIENT-HANDOVER.md). **Recovery:** [Backup and restore](docs/BACKUP-RECOVERY.md). **Release scope:** [Launch plan](docs/LAUNCH-PLAN.md).

## Development

Requires Node.js 22.12+ or 24 and PostgreSQL 15+. Use a separate local database.

```sh
npm ci
cp .env.example .env
# Fill DATABASE_URL and generate the independent secrets described in .env.example.
npm run db:generate
npm run db:deploy
npm run dev
```

For a clean company, set all five `INITIAL_*` environment variables securely and run `npm run client:setup`, then remove those variables. The command refuses a populated database belonging to another company. `npm run db:seed` is for a disposable demo only; it is never part of production startup.

## Production

```sh
npm ci
npm run build
npm start
```

Build generates the Prisma client without connecting to or changing the database. `npm start` first runs tracked migrations and optional clean-company initialization, then starts Next.js. Set the exact HTTPS `NEXTAUTH_URL`, independent auth/backup/cron secrets, `TZ=Asia/Karachi`, and a private PostgreSQL URL. Supply `DIRECT_URL` for migrations when using a pooled application endpoint. Do not use MySQL, `db push`, migration baselining, demo credentials, or `npm run dev` for this deployment.

## Validation

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
# Against an isolated migrated test database only:
RUN_DATABASE_CONCURRENCY_TESTS=1 npm run test:integration
npm run build
```

The integration suite includes actual PostgreSQL stock reservations, financial postings, invoice corrections, returns, direct-deal reversal and concurrent tills. See the release validation record for actual outcomes; commands printed here are not proof they passed on a particular deployment.

Data remains server-side; private pages are not service-worker cached. The cloud client workflow requires a connection. Read screens refresh automatically about every five seconds while visible, pausing during unfinished entries. Provider keys, schedules, DNS, TLS and real-host acceptance tests are deployment prerequisites rather than files installed by `npm`.
