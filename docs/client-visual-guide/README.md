# Mars Textile — visual client guide pack

Prepared 21 October 2026 (Pakistan time).

## Files to share with the client

1. **MARS-TEXTILE-VISUAL-HANDBOOK.pdf** — the complete 20-page visual office handbook. It covers roles, the current menu, opening figures, receiving and pricing, lots, sales, recovery, mill payments/PDC, returns, direct deals, accounts, reports, Excel sharing, backups and a worked example.
2. **MARS-TEXTILE-DAILY-DESK-CARD.pdf** — a one-page A4 checklist to print and keep beside office computers.

Share the PDFs as documents through WhatsApp or email. Both use warm white, deep green and charcoal, with diagrams and selected screenshots from the working release. Screenshot names/figures are synthetic training examples, not client business records. All app screenshots were captured from an isolated local training database; no trading document was posted to obtain them.

## Editable versions

The matching `.html` files and `assets/` folder are included. Keep them together, open an HTML file in a browser, and print to PDF using A4, background graphics enabled, no margins, and browser headers/footers disabled. The HTML contains the page layout and selectable text. `build_guide.py` generates both HTML documents from editable content; it requires Python 3, with the included local assets remaining in place. The PDF export used Chromium. Font licence notices are in `assets/licenses/`.

This guide describes the working textile release at source commit **ca9f874**. It does not activate additional services. Manual sharing requires the user to send the document; automatic nightly email/WhatsApp, provider approval, scheduling and offsite backups require their own configuration and live verification.

The handbook replaces the older guide for these release-specific training steps. The original source guides are preserved. The implementer's separate review document records the corrections and reviewed GitHub versions.
