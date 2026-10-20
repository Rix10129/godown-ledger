# Encrypted office backup and recovery

Application exports are encrypted `.godown-backup` files using AES-256-GCM, a scrypt-derived key, per-collection counts and a SHA-256 payload checksum. Version 3 includes the financial data, people/PIN hashes, imports/opening-stock evidence and evening-delivery receipts. Version 2 can still be validated/restored where compatible; it lacks the newer collections. Live desk sessions are intentionally excluded. Do not put the encryption key beside the backup or in chat.

## Daily backup

The owner uses More → Settings → Download encrypted office backup. Configure `BACKUP_ENCRYPTION_KEY` before using the download link. Store a copy outside the hosting account. For nightly automation, configure private R2 storage or encrypted email and schedule `/api/cron/backup` with the secret bearer header; see HOSTINGER-DEPLOYMENT.md. HTTP 503 means a destination/provider failed, not a successful backup. An email prepared locally is not proof it arrived.

Keep at least 30 daily backups, 12 month-end and 7 year-end copies if required by the client's retention policy. The R2 routine prunes ordinary daily objects after 30 days; preserve month/year-end copies under a separate archival prefix before pruning. Enable provider recovery history/PITR appropriate to the acceptable data-loss window. Agree this policy with the owner; nightly export alone may lose a whole day's work.

## Test and restore to a separate database

1. Keep the live database and prior application release untouched. Download the backup and obtain its encryption key separately.
2. Settings → Validate a backup checks authentication, checksum, counts, references, stock movements and balanced journals. **This does not restore data and is not a substitute for an actual recovery drill.** The old spreadsheet importer is not this operation.
3. Create an EMPTY PostgreSQL database. Install this matching app release on the operator's trusted machine. Apply migrations to the empty target using a temporary secure `DATABASE_URL`/`DIRECT_URL`; never accidentally inherit the production direct URL.
4. Set `RESTORE_DATABASE_URL` to the empty target and `BACKUP_ENCRYPTION_KEY` to the backup's key through a private environment file or secure shell environment. Run:

```sh
npm ci
npm run db:generate
# With DATABASE_URL and, if needed, DIRECT_URL pointing to the EMPTY target:
npm run db:deploy
npm run backup:restore -- --empty-database --file /private/path/company.godown-backup
```

The restore command refuses a populated target, runs transactionally, restores parent records before dependent rows, resolves account/journal self references, and verifies every restored collection's count. It does not overwrite or merge the live company. It resets session identifiers/lockout counters and never restores signed-in desk sessions. Keep this operator task off a public web route.

5. Run the target app on a private/test address. Verify mill login, owner PIN, staff roles, representative bill/purchase/return/direct deal, buyer/mill balances, stock, P&L and trial balance. Compare these with the original snapshot and manifest counts. Record the backup date, checksum, recovery duration and outcomes. A structural validation result alone is insufficient.
6. If recovery is required, stop live writes and take a final rollback snapshot. Switch the application's database settings to the TESTED restored database; update both pooled and direct URLs, restart and verify `/api/health` and the owner's book. Keep the old database intact until the owner signs off. Re-enable the scheduler only after checking restored delivery receipts; do not blindly resend WhatsApp messages with unknown acceptance.

If the wrong key, mismatched schema, missing references or unbalanced stock/journals is reported, stop and investigate. Never edit a backup's checksum to force it through or disable encryption verification. For very large datasets, use the database provider's transactional backup/restore tooling and verify the same business controls.
