# Mars Textile — BAG edition client guide pack

Updated 21 October 2026 (Pakistan time). This BAG edition replaces the earlier KG-centred handbook examples after the client clarified that normal trading is per bag. KG remains optional.

## Share these two PDFs with the client

1. **MARS-TEXTILE-VISUAL-HANDBOOK-BAG-EDITION.pdf** — 20 visual A4 pages covering roles, the office menu, opening figures, bag receipts and pricing, lots, sales, recovery, mill payments/PDC, returns, direct deals, accounts, reports, Excel sharing, backups and a complete whole-bag example.
2. **MARS-TEXTILE-DAILY-DESK-CARD-BAG-EDITION.pdf** — one A4 page for printing beside office computers.

The worked example is 100 bags received at Rs 1,000 each; 30 bags sold at Rs 1,500; Rs 10,000 recovered; 2 bags returned. Remaining stock is 72 bags at Rs 72,000 cost, and buyer due is Rs 32,000. Taxes, discounts, openings, mill payments and office expenses are excluded from this illustration.

The screenshots were captured from a separate synthetic training company, populated through real transaction actions and checked against its stock, buyer dues and balanced books. They are not client business records. No trading documents were submitted during screenshot capture.

## BAG and KG in the application

App release source **399c83f**, on `client/textile-release-2026-10-20`, makes BAG the default for new products and direct deals. Prices follow the selected primary unit. KG remains a separate option. Existing products keep their original units; there is no assumed bag weight or automatic bag/KG conversion. Sub-unit catalogue details are not a conversion feature.

The app change must be deployed on Hostinger to take effect there. The guide files do not deploy software or alter the live book. Preserve the existing hosting environment settings.

## Editable versions

Keep the matching `.html` files with `assets/`. Open HTML in a browser and print with A4, background graphics enabled, no margins, and browser headers/footers disabled. `build_guide.py` regenerates the HTML from editable content using Python 3 and the included assets. PDF export used Chromium. Font licence notices are in `assets/licenses/`.

Share the PDFs as documents through WhatsApp or email. Manual sharing requires the user to send the file. Automatic nightly WhatsApp/email delivery, scheduling and offsite backups require separate configuration and live verification. No passwords, owner PINs, database credentials or production business data are included.
