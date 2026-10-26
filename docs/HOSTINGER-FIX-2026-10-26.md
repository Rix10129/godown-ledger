# Hostinger transaction fix — 26 October 2026

Target: `Rix10129/godown-ledger`, branch `client/textile-release-2026-10-20`, based on `399c83fade5801c72aa6934b83e0896b99d78c05`.

## Problems and changes

- The supplied Hostinger log compiled successfully and applied all 11 existing migrations, then failed acquiring a first-time company setup transaction. Optional deployment setup now checks whether a company exists and skips initialization with a single read. Explicit setup keeps its original identity checks; existing passwords, PINs and business records are preserved.
- Invoice posting inherited Prisma's five-second transaction limit. Application transactions now allow 30 seconds, with a separate 15-second acquisition limit and bounded connection waiting. Posting still commits or rolls back atomically.
- Staging exposed excessive database round trips when missing accounting accounts were backfilled. Missing rows now use a single conflict-safe bulk insert and a read. Existing accounts remain unchanged.
- A forged `bypassCreditLimit` form field could let sales staff skip their credit-limit checks. Only owner/admin roles can request that override; the existing authorization policy still determines who can create invoices.
- Zod was updated to resolve the remaining production dependency advisory. GitHub quality checks now also cover the branch connected to Hostinger.
- Successful `/api/health` responses include release marker `codex-hostinger-fix-20261026`; health responses disable caching so the running release can be identified after deployment.

## Verification

- 65 unit tests passed; no failures or skips.
- 25 integration tests passed on an isolated, freshly migrated local PostgreSQL database; no failures or skips.
- The initial Neon staging run passed 22 of 23 checks. Its KG workday failed while creating missing accounts. After the bulk-insert correction, both BAG and KG workdays passed on staging. The expanded five-check invoice regression also passed on staging, covering account backfill, a forged credit override, delayed invoice posting, duplicate submission, and rollback on insufficient stock.
- Fingerprints of all 39 staging tables matched the pre-test baseline after fixture cleanup. Copied business records were unchanged.
- All 11 expected migrations were already present on staging. This change adds no migrations and preserves exact NUMERIC fractional quantities and cost snapshots.
- Fresh installation and repeated optional company setup passed on a separate local fixture database. Optional setup also skipped correctly on the initialized staging copy.
- Production build (all 60 static pages), TypeScript and formatting passed. Lint passed with 218 existing warnings and zero errors. Production dependency audit reported zero vulnerabilities.

## Deployment and limits

Keep Hostinger's existing production `DATABASE_URL`. `STAGING_DATABASE_URL` belongs to the testing environment; do not substitute it for the live database. The staging copy expires according to its Neon branch settings.

Apply this commit to the connected release branch, then check the Hostinger deployment result and `/api/health` for the new marker. If auto-deployment is disabled, use Hostinger's Redeploy button. A successful Git push alone does not prove deployment succeeded.

The earlier review and repair patch against the older `main` base are separate work. They must not replace this release, which already includes newer desk/PIN access, direct deals and fractional quantity handling. This document records the current release's checks; it does not certify every business workflow or replace user acceptance testing.
