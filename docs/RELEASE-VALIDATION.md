# Release validation — 20 October 2026

## Compared sources

The GitHub ZIP is the older Next.js/PostgreSQL application. The newer Grok ZIP is a separate TanStack prototype. They were not already merged and must not be run as two live books. This release implements the selected shared-book and personal-desk workflow in the GitHub application. Prototype PIN/storage code was not adopted as production authorization.

## Executed checks

- 57 unit tests passed; 19 PostgreSQL integration tests passed, with database concurrency tests enabled.
- TypeScript checking passed. ESLint reported no errors (230 warnings, mainly inherited). Production build passed with an intentionally unavailable database: build does not mutate the live database.
- Real production-browser workflow passed: shared login, wrong PIN, owner/staff desks, server role restrictions, revoked-cookie rejection, mill/product/buyer creation, keeper unpriced receipt, accountant pricing, fractional credit sale, recovery, original-invoice return, encrypted backup export/validation, balanced evening note and mobile navigation.
- Two independent browser contexts verified that a posted receipt appears on the other computer automatically. Editing pauses refresh to preserve unfinished entries.
- Final build separately checked return credits on the original bill and the evening note's buyer returns and pending-rate receipts.
- PostgreSQL tests verified exact fractional stock, original-price returns, discounts/tax, COGS, direct deals/idempotency/reversal, stock races and balanced journals.
- Encrypted financial backup was decrypted and restored into a separate empty database; financial totals/counts checked. Restore refused a populated target. Live desk sessions were not restored.
- Node 22 Docker image built, ran as a non-root user, migrated, passed health/login/PIN/ledger checks and preserved database records after restart. The final small report/return-balance display changes were subsequently verified by native production build and browser; rebuild the supplied Dockerfile for deployment.
- Clean company bootstrap and repeated bootstrap tested without demo records or credential reset. All 11 migrations applied.
- Provider request/retry/error tests used fake transports. No real client email or WhatsApp messages were sent.

## Dependencies and limits

Hostinger deployment follow-up: the default `npm run build` with `HOSTINGER_DEPLOY=true` passed its full production build and postbuild migrations against a local QA database. The database preparation also passed with bootstrap variables removed and with repeated bootstrap; a missing database URL correctly stopped preparation. This verifies the supplied deployment command locally, not Hostinger deployment or the client's Neon connection.

Hostinger compiler follow-up: the real host rejected native SWC with missing `GLIBC_2.29`, before database preparation. Changed configuration to `next.config.mjs` and build to `next build --webpack`. A local full production build passed with both native SWC loaders deliberately made unavailable, exercising Next's actual WASM fallback. The matching WASM tarball's SHA-512 integrity was checked before seeding the local download cache (this environment cannot resolve npm through direct fetch). Browser login, personal PIN unlock and database-backed ledger passed on that build with native SWC still disabled. This simulates native compiler failure; it is not a test on Hostinger's actual operating system. Redeploy the latest branch there to confirm the real host result. No dependency downgrade or audit-force update was used.

Next.js 16.4.2, NextAuth 4.24.15 and Prisma 7.10.1 are pinned. Final `npm audit --omit=dev` reported **zero known production vulnerabilities**. The full development tree retains five high-severity advisories through the ESLint glob/braces tooling; the registry had no compatible stable braces fix when reviewed. Do not expose development tooling as a network service. An audit result is not a security certification.

Hostinger plan capability, actual production database, DNS/HTTPS, office connectivity, provider delivery, external scheduler and offsite backup destination require verification on the actual account. None is represented as deployed or verified here. GitHub main has not been published by this release work.

Read HOSTINGER-DEPLOYMENT.md and complete its real-host acceptance checks before entering live business data. Internet is required. FBR integration, job-work, structured multiwarehouse transfers and historical-book import are outside this release; see LAUNCH-PLAN.md.
