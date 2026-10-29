# Mars Textiles — development release, 29 October 2026

Development branch: `development/mars-workflows-20261029`, based on the Hostinger release `4f7a9a6`. The Hostinger-connected branch remains `client/textile-release-2026-10-20`. This development release has not been deployed to Hostinger or applied to the Neon staging database.

## Business rules implemented

- Production units have a default wage rate per metre. Each yarn issue creates a production job with its own agreed rate; changing the default later does not change existing jobs.
- Yarn issued to a weaving unit leaves available godown stock and transfers its value to the Yarn at weaving units account. It remains our asset.
- Each cloth receipt records actual metres and actual yarn consumed, without assuming a fixed yarn-to-cloth conversion. Wages are metres received times the job's rate. Finished-cloth cost includes the consumed yarn and weaving wages. Payments reduce the unit's unpaid wages separately. Unused yarn can be returned to the original lot.
- A customer order has separate lines for each product/quality/colour. An order posts neither stock nor money. Sales invoice lines can be linked to the appropriate order; only posted delivery bills count towards delivery. Invoice reversal restores the undelivered order balance. Goods returns do not automatically reopen an order.
- Ordered, delivered and remaining quantities are visible under Customer orders. Orders can be closed while retaining their history. Ordered quantities can be corrected with a reason, but cannot be reduced below deliveries already made. Edits are audited.
- Gazana means metres. Each thaan has an individual length, not a fixed conversion. Production receipts accept individual thaan lengths; their total must equal the received metres. The stock screen can also divide an existing cloth lot into measured thaans without changing total metres or value. Unused measurements can be reversed. Receipts and measurements support up to 500 thaans per operation, using bulk database writes.
- Sales forms allow selecting an individual thaan/lot, show metre quantities and the rate per unit, and retain order allocations when quantities span several lots. Saved drafts preserve the allocations. Order-linked bills are corrected by reversal and re-entry so their delivery history cannot silently change.
- The Stock screen shows stock by mill/lot, yarn at production units and remaining party orders. An additional custody register keeps customer-owned goods outside our own inventory and valuation.
- Product catalogue purchase and sale rates are optional; an unset catalogue price is displayed as Not set. Received stock and production issue/receipt workflows still require valid prices for valuation.
- Bukram and Production Cloth are available as customer types in entry forms, filters and reports.
- New duplicate payment references and cheque numbers are rejected at the database boundary, including concurrent entries. Payment references are compared without outer whitespace or case differences, scoped to company, payment direction and payment mode; supplied bank names distinguish different banks. An unknown bank does not bypass an existing reference. Cheque-register identity also includes bank and payable/receivable direction. Existing repeated references are retained for reconciliation.
- Duplicate guards return short inline form messages. Record one transfer/cheque once; a payment covering several bills should be entered as a general customer receipt rather than duplicate receipts with the same reference.
- The customer ledger's displayed opening amount now agrees with the original starting amount used by its running balance and subsequent correction entries.
- Quantity corrections use recorded, locked stock adjustments. Received costs and production receipts remain subject to history-preserving correction rules; a receipt with later stock movements cannot be freely overwritten. Wage-payment and unused production-receipt reversals are supported.

## Verification

- 68 unit tests and 37 database integration checks passed, with no failures or skips. Tests exercise real posting code, concurrent order deliveries, duplicate references, different-bank cheques, tenant isolation, staff restrictions, wage-rate snapshots, order amendments, thaan measurements, reversals and backup validation.
- Production build, TypeScript, formatting and lint passed; lint retains existing/legacy warnings and has no errors.
- Chromium checks passed for shared login, PIN unlock, six application pages, both new customer types, optional catalogue prices, customer-order creation, measured thaan selection, metre labels, recording existing-stock measurements and mobile layout.
- A fresh local database accepted both new migrations. A separate populated local database was upgraded; fingerprints of all original columns in 38 business tables were unchanged.
- An encrypted training backup was restored to an empty database. All 44 backup collections matched the saved dataset after restoration. The drill caught and corrected timestamp changes while relinking production batches.
- Restored training balances: our stock Rs 29,400; yarn at weavers Rs 400; unpaid wages Rs 2,800; customer due Rs 7,500. Fresh mill login, PIN unlock and the new screens also passed against the restored database.

## Database and backup changes

Two additive migrations introduce customer orders, production units/jobs/receipts/payments, custody entries, optional invoice-to-order links, individual-thaan metadata, payment bank identity and duplicate guards. They do not delete old repeated references or infer thaan lengths from bulk stock. Backup format 4 includes the new collections; formats 2 and 3 remain accepted. Restore continues to require an empty, migrated target and does not restore authenticated desk sessions.

## Review and rollout

1. Review this branch and the screenshots before changing the live website.
2. Use a separate, current Neon staging copy for migration and business acceptance testing. The earlier staging branch may expire; confirm its status first. Keep production and staging connection strings separate.
3. On staging, check a real example: order 500 bags, deliver 100 and then 50, leaving 350; receive thaans of 20, 100 and 200 metres, giving 320 metres; at Rs 40/metre, wages are Rs 12,800; paying Rs 10,000 leaves Rs 2,800.
4. Take and verify a production backup before applying the migrations to the live database. Preserve the old release for reference; returning to old application code alone does not undo posted production/order activity.
5. Deploy only the reviewed release to the connected Hostinger branch. Verify deployment success and `/api/health` release marker `mars-workflows-20261029`, then repeat login/PIN and business checks.

## Developer reproduction

Use Node 22, `npm ci`, `npm run db:generate`, and an isolated PostgreSQL 17 database. Apply migrations with an explicit test `DATABASE_URL`. Run `npm run test:unit`, `RUN_DATABASE_CONCURRENCY_TESTS=1 npm run test:integration`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build`. Never seed a live database.

In the prepared cloud workspace, source `/workspace/.cloud-setup/runtime.sh`. Local fixtures use databases `mars_development_20261029` (automated tests), `mars_demo_20261029` (training/browser checks) and `mars_restore_verified_20261029` (verified restore). Browser and restore evidence is retained under `/workspace/.cloud-setup/mars-*`. Restart local PostgreSQL and application processes when needed; snapshots do not retain running processes. Preserve the older uncommitted work under `/workspace/godown-ledger`.
