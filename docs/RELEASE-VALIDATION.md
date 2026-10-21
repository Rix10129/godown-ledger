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

## Workflow PDF and Excel sharing follow-up

- Compared all three pages of the client's workflow PDF. The detailed requirement/status mapping is in [WORKFLOW-AUDIT.md](WORKFLOW-AUDIT.md), including the agreed shared login/personal PIN update and automatic sales stock-out choice.
- **65 unit tests passed**, including general receipt/discount/return aging, overdue priority, undated opening balances, safe workbook filenames, frozen email attachment retries and refusal to imply an unsupported automatic WhatsApp Excel template send.
- **19 PostgreSQL integration tests passed** with concurrency checks enabled. The fractional textile workday also renders/reopens the real Excel workbook, checks numeric sales/stock values, three-decimal quantity formatting and safe string cells.
- Final production build and TypeScript checking passed. ESLint had zero errors (219 warnings, mainly inherited); the final transport simplification was also checked after the full lint run.
- Final production-server browser acceptance passed: 11-sheet XLSX download, company isolation, private/no-store response, expired business-date rejection, desktop prepared-file download, mobile layout, native File handoff/cancellation through a mocked OS chooser, owner/bookkeeper access and keeper/salesman rejection.
- Browser fixtures reconcile a Rs 412.50 sale minus Rs 100 general recovery and Rs 75 return to Rs 237.50 in buyer dues, aging Excel/PDF and recovery. Stock is 10.25 kg at Rs 1,025 cost. The keeper sees posted purchase/sale/return quantities and references without financial amounts; malformed/out-of-range movement pages are handled.
- The user supplied screenshots showing successful Hostinger deployment before this follow-up. This update is validated locally against a separate synthetic PostgreSQL database; the new Hostinger deployment and real phone/WhatsApp file receipt still need live confirmation. No production data or provider credentials were accessed, and no actual messages were sent.
- Manual Excel sharing requires no new environment variables or database migrations. Scheduled email can include the frozen workbook; scheduled WhatsApp remains an approved text summary. **Actual provider credentials, template approval, external scheduling and received-message acceptance remain configuration/verification work.**

## BAG-first trading clarification — 21 October 2026

- Client clarified that normal trading is **per bag**, with KG optional. BAG was already a supported product unit. New product and direct-deal forms now default to BAG; the direct-deal server also accepts BAG, while retaining KG, metre and thaan support.
- Product and direct-deal forms show the rate unit; receipt pricing shows the product unit, and sales/return line labels include it. BAG and KG remain distinct units, without an assumed weight or automatic conversion. Catalogue sub-unit fields do not implement a conversion.
- Existing products retain their unit. The product edit form locks it; the update action rejects a forged unit change, protecting old stock and documents from relabelling. No existing client stock, prices or business data are converted, and no schema migration or new environment variable is needed.
- **65 unit tests and 20 PostgreSQL integration tests passed**, with concurrency enabled and no skipped cases. The full textile-workday test runs once with BAG and once with KG, exercising purchases, sales, returns, direct deals/reversal, balanced journals, encrypted backup and workbook unit output.
- Final production build and TypeScript passed. Full ESLint had zero errors (219 inherited/style warnings); final action/form/test edits were linted separately with no errors.
- Production-browser acceptance checked BAG default and optional KG, dynamic per-unit price labels, existing KG edit preservation, server refusal of a forged KG→BAG change, BAG/KG direct-deal choices, and real Excel stock/buyer-dues values.
- A separate synthetic training company was populated through real purchase/sales/payment/return server actions: receive 100 bags at Rs 1,000; sell 30 at Rs 1,500; recover Rs 10,000; return 2 bags. Verified 72 bags remaining, Rs 72,000 stock cost, Rs 32,000 buyer due and balanced books. The revised client handbook uses this whole-bag example and fresh BAG screenshots. No production data or credentials were accessed.
- Hostinger deployment completion remains a real-account acceptance step after the branch update. The guide is delivered separately and does not itself deploy the software.
