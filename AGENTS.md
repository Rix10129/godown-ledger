<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cloud Agent environment

PostgreSQL 16 runs locally. On boot the environment creates the `poultry` role (password `poultry`), the `poultry_vet`, `poultry_vet_shadow`, and `poultry_test` databases, writes `/workspace/.env`, applies Prisma migrations, seeds demo data, and serves `npm run dev` at http://localhost:3000.

Prisma 7 reads `.env` from `prisma.config.ts`. It does not load `.env.local`.

Demo login (seeded): `owner@demo.com` / `demo1234`. The same password works for `cashier@demo.com` and `salesman@demo.com`.

```bash
npm run lint
npm run typecheck
npm run test:unit
# Integration tests use the separate poultry_test database, matching CI:
DATABASE_URL=postgresql://poultry:poultry@127.0.0.1:5432/poultry_test npx prisma db push
DATABASE_URL=postgresql://poultry:poultry@127.0.0.1:5432/poultry_test RUN_DATABASE_CONCURRENCY_TESTS=1 npm run test:integration
```
