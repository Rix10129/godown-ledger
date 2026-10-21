# Godown Ledger — future-use kit

Prepared 21 October 2026 (Pakistan time).

## Keep these files

- **Godown-Ledger-Textile-Release.zip**: the complete application source at release commit ca9f874, including the Excel-sharing update. Unzip it to find SETUP.txt and the current deployment/handover documents.
- **Godown-Ledger-Client-Guide.pdf**: the original client guide. For the newer Excel-sharing and movement-history instructions, read docs/CLIENT-HANDOVER.md inside the application ZIP.
- **skill/cloud-environment-onboarding/SKILL.md** and **references/onboarding.md**: the onboarding skill and its referenced guide. These are instructions for a coding agent, not a program to double-click. Their tool names refer to Codex; using them elsewhere may require adaptation. They do not install the plugin or transfer account permissions.
- **environment/install-script.saved.sh.txt**: exact saved installation instructions from the environment settings shown in chat.
- **environment/start-skill.saved.md**: exact saved startup instructions from those settings.
- **environment/network-settings.json**: the selected package-manager access policy and extra allowed domain. It is a reference for settings; importing a JSON file does not change network access automatically.
- **environment/CURRENT-DEVELOPMENT-NOTES.md**: corrections and current instructions for a future developer.

The two saved environment instructions are HISTORICAL: they describe the initial main-branch setup, before the release work was complete. Preserve them as a record; use the current documents in the application ZIP for future deployment. In particular, the historical install script runs demo seeding, so it is intentionally saved as text and should not be run against the client's database.

No Hostinger, Neon, owner-login or production secret values are included. Local demo credentials in the historical instructions are examples for the isolated development database only. Keep production secrets and verified encrypted business backups separately; source files do not contain the client's live book.

## Restore or hand over later

1. Give a developer the application ZIP and this kit.
2. Tell them the working release branch is client/textile-release-2026-10-20, with this source snapshot at ca9f874.
3. Read SETUP.txt, docs/HOSTINGER-DEPLOYMENT.md and docs/CLIENT-HANDOVER.md inside that ZIP. Keep the existing Hostinger environment values for the running installation.
4. For full workflow coverage and limitations, read docs/WORKFLOW-AUDIT.md and docs/RELEASE-VALIDATION.md. Automatic evening delivery still requires provider/scheduler setup; manual Excel sharing is included.
5. A new development machine needs its own dependencies and an isolated PostgreSQL database. The kit does not transfer the current development machine, Docker data, production data or credentials.

The separate GitHub download branch stores these files only; it is not the branch configured for Hostinger deployment.
