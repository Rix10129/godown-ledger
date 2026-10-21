<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cloud Agent environment

This is the Hostinger release (`client/textile-release-2026-10-20`). The live office is https://lightblue-herring-546940.hostingersite.com. Develop against the local PostgreSQL database below. Do not point `DATABASE_URL` at the hosted company, and do not run `db:seed`, `db:reset`, or `db:push` against it.

On boot the environment installs nothing new. It starts PostgreSQL 16, creates the `godown` role (password `ci_test_only`) and the `godown`, `godown_shadow`, and `godown_test` databases, writes `/workspace/.env`, applies migrations, bootstraps an empty local company, and serves `npm run dev` at http://localhost:3000.

Prisma 7 reads `.env` (`DIRECT_URL` when set, otherwise `DATABASE_URL`). Leave `HOSTINGER_DEPLOY` unset locally so `npm run build` does not need a database. Hostinger itself builds with `HOSTINGER_DEPLOY=true`.

Local office only (not the Hostinger login):

- Company: Mars Textile
- Email: `owner@mars-textile.local`
- Password: `local-dev-pass-12`
- Owner PIN: `2468`

Sign in, enter the PIN on “Who’s at the desk?”, then the books open.

```bash
npm run lint
npm run db:generate && npm run typecheck
npm run test:unit
DATABASE_URL=postgresql://godown:ci_test_only@127.0.0.1:5432/godown_test npm run db:deploy
DATABASE_URL=postgresql://godown:ci_test_only@127.0.0.1:5432/godown_test RUN_DATABASE_CONCURRENCY_TESTS=1 npm run test:integration
```
