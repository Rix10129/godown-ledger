# Current development notes

These notes supersede stale status statements in the historical saved settings.

- Use the existing isolated checkout; do not create a Git worktree unless explicitly requested. Read AGENTS.md and the bundled Next.js documentation before code changes.
- The release is client/textile-release-2026-10-20 at ca9f874, not the old main branch. Node.js 22.12+ within the package.json engine range and PostgreSQL are required; npm ci uses the checked-in package-lock.json.
- .env.example is present in this release. Preserve existing local configuration. Use a separate disposable development database, never the client's Neon database for seeds, resets, db push or destructive integration tests.
- Current build is npm run db:generate followed by next build --webpack. The plain next.config.mjs and Webpack/WASM fallback address the Hostinger native compiler problem. Do not revert to the earlier TypeScript config/Turbopack setup.
- npm run build performs Hostinger migrations/optional bootstrap only when HOSTINGER_DEPLOY=true. Leave it unset for ordinary local builds. npm start runs prestart migrations and optional bootstrap; verify the database target first.
- Development checks already passed on the release: 65 unit tests, 19 PostgreSQL integration tests with concurrency checks enabled, TypeScript, production build, and the documented production-browser acceptance checks. Historical startup notes saying these are unverified are out of date. A fresh machine still needs its own readiness checks.
- Start required database services again after machine restoration. Existing Docker container metadata/processes are not guaranteed to survive. The previous workspace used a PostgreSQL 17 container called godown-postgres; use platform-supported Docker when available or a separate local PostgreSQL instance.
- Prisma generation and migrations were subsequently verified. Preserve TLS/checksum checks when downloading packages or engine artifacts.
- Before starting npm run dev, configure an isolated development DATABASE_URL and DIRECT_URL plus independent local auth/backup/cron secrets using .env.example. Never copy production secrets into this kit or chat. Check /login and a database-backed page locally; do not publish a localhost preview link.
- Integration tests need a distinct disposable test database with migrations applied, not the regular development database. Run the repository's test:integration command with RUN_DATABASE_CONCURRENCY_TESTS=1 and the disposable DATABASE_URL. Report executed/skipped outcomes accurately.
- Manual Excel sharing needs no extra environment variable. Automatic evening email/WhatsApp, external scheduling and offsite backup services remain account-specific setup and verification work.

Read docs/RELEASE-VALIDATION.md, docs/HOSTINGER-DEPLOYMENT.md, docs/BACKUP-RECOVERY.md and docs/WORKFLOW-AUDIT.md in the application ZIP for details.
