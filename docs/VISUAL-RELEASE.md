# Mars Textile visual release — 20 October 2026

The approved warm-white/deep-green proposal is implemented in the working Next.js application. This is a presentation update; no database schema or business-data migration is included.

## What changed

- Shared colour tokens, readable secondary text, serif page headings, green actions, consistent controls and a woven-grid identity. Existing forms, reports, people and settings inherit the shared palette.
- Six expandable navigation groups keep existing features reachable while filtering links through the existing server role rules. Most-specific route highlighting, mobile drawer keyboard focus, Escape handling and a skip link are included.
- Login, PIN selection, password reset and verification screens share the office identity. The PIN stays masked; personal desk authorization and lockout remain server-enforced. Login includes an accessible password visibility control.
- Owner day book prioritizes bills issued today, recovery received today and buyer outstanding. Recent-bill status accounts for original-bill return credits. Quick tasks and a first-day setup guide replace the previous scattered shortcuts.
- Godown, mills and pricing use labelled fields, unit-aware quantity entry, useful prerequisites and clear available/unpriced stock states. Missing-master shortcuts respect each role. The keeper's stock data still excludes rates and money.
- Sales and evening note use matching headers and actions; private data stays uncached. The offline notice correctly requires reconnection before saving entries.
- Light is the default for the approved design. A new `office-theme-v2` preference leaves the old low-contrast theme choice behind; the user may choose the revised dark theme. Print styles force readable light colours and hide the app shell.
- Browser/home-screen icons and manifest colours match the design; the old default favicon is replaced.

## Configuration and deployment

Use the existing Hostinger-tracked branch, Node 22, `npm run build`, `.next`, and existing environment variables. No new variable is required. `HOSTINGER_DEPLOY=true` still applies tracked migrations idempotently and runs bootstrap only when configured. This visual release adds no migrations.

Public installation branding defaults to Mars Textile for this client. Optional `NEXT_PUBLIC_OFFICE_NAME` can override the public login title at build time; authenticated company names and uploaded logos continue to come from that company's settings. No unauthenticated tenant/database lookup supplies public branding.

After Hostinger successfully deploys the new commit, refresh the site (Cmd+Shift+R on Mac), sign in and confirm the owner/PIN workflow. Preserve the database URLs, secrets and existing company records. Once owner access is confirmed, remove the five `INITIAL_*` bootstrap values as described in HOSTINGER-DEPLOYMENT.md; retain the ordinary runtime variables and `HOSTINGER_DEPLOY`.

## Verification

- Production Webpack build and TypeScript passed. 57 unit tests passed. ESLint reported no errors (220 existing/style warnings).
- Production browser checks covered login, wrong PIN, owner/staff PIN access, revoked-session rejection, keeper receipt, accountant pricing, fractional credit bill, recovery, original-bill return, encrypted export/validation, balanced evening note and a second computer receiving updated stock automatically.
- Dedicated visual checks covered login/PIN/day book/godown/bills/people/settings/evening, light default despite the old stored theme, dark/light switching, 390px mobile width, mobile menu and Escape.
- Invoice PDF generation hid sidebar/topbar and preserved bill figures. Ledger and P&L pages rendered.
- Screenshots and browser fixtures used a separate local QA database with synthetic people and transactions. No client production records or credentials were used in development verification. Hostinger's resulting public deployment must still be confirmed from the real browser/account; this workspace cannot reach the Hostinger website through its network proxy.

The earlier design preview remains a proposal snapshot. The tested application screens are recorded separately on the design branch.
