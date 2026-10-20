# Textile client launch plan — 20 October 2026, Pakistan time

## Agreed scope

New textile company in Lahore; implementer in Multan; Hostinger Business account; existing manual books are not being imported for launch. One hosted application/database serves all office computers. The original Next.js/PostgreSQL repository is the base; Grok's standalone TanStack desk is a requirements/reference implementation, not a second application being deployed.

## Release work

1. **Integrity:** preserve PostgreSQL precision for fractional quantities, use decimal money calculations, snapshot sale lot costs, post COGS/Inventory together, handle returns from original documents, protect concurrent stock reservations, and include corrections/reversals in financial reports.
2. **People:** one mill login followed by a personal PIN; server-side permission checks and revocable sessions; hashed/different PINs, lockout, owner-only staff management, safe keeper data projection, and no cached private financial pages.
3. **Workflow:** mills, physical stock, unpriced receipts/bookkeeper approval, products, purchases, udhar/cash bills, recovery, cheques, returns, linked direct deals without stock movement, and a Pakistan-date evening note.
4. **Operations:** separate build from migration/startup, clean-company bootstrap without demo data, HTTPS deployment configurations, encrypted backups and an actual empty-database restore path, provider-aware scheduled delivery with explicit failure states.
5. **Evidence:** unit tests, actual PostgreSQL integration checks, clean install/repeat bootstrap, production build, browser roles/lock test, mobile view, backup/decryption and recovery drill. Actual outcomes are recorded separately in RELEASE-VALIDATION.md.
6. **Client handover:** final domain, account ownership, owner credentials supplied securely by the deployer, individual staff, approved opening figures, remote acceptance from a Lahore office PC, backup destination, recovery window and support contact.

## Launch gates requiring the actual hosting account

- Confirm this particular Hostinger subscription has Node.js Apps; otherwise use a Node host/VPS. PHP/file hosting alone cannot run this application.
- Provision a clean PostgreSQL database and final HTTPS address, enter secure variables, deploy the reviewed source and remove bootstrap values.
- Validate database connectivity, migrations, cookie/PIN access, two-office-PC visibility and restart persistence on that real host.
- Configure and verify at least one offsite backup destination; perform a restore drill. Agree the data-loss/recovery targets with the owner.
- For automatic evening email/WhatsApp: supply a verified sender/provider credentials and a scheduler; WhatsApp also needs an approved template/business sender. Transport contract tests are not real delivery tests.

Do not call the application live until these host checks pass. A locally built ZIP does not publish changes to GitHub, deploy Hostinger, configure DNS, or create provider accounts.

## Not represented as finished in this release

FBR/PRAL e-invoicing and legal/tax certification; structured multi-godown transfers; per-thaan length conversion; dyeing/job-work tracking; broker commissions; historical manual-book migration; and offline trading with secure cross-person synchronization. Record these as separate requirements if the client needs them. Today's selected cloud workflow requires Internet; read screens automatically refresh from the shared database about every five seconds, pausing during unfinished entries.
