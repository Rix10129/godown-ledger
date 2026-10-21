# Bag-edition guide follow-up — 21 October 2026

The client clarified after reviewing page 19 of the first visual handbook that trading is **per bag**, with KG optional. The first handbook's KG-centred examples were illustrative, but did not match the client's normal unit of trade. The BAG edition supersedes those examples throughout the handbook and desk card.

## Application alignment

Source `399c83f` on `client/textile-release-2026-10-20`:

- New products default to BAG, with KG and the existing other units still available.
- Direct deals now offer/accept BAG and default to it. KG, metre and thaan remain supported.
- Product, direct-deal and receipt-pricing forms show the price unit; sales and returns show their line unit.
- Existing product units are locked and server-side edits reject forged unit changes. No old quantities or prices are relabelled or converted.
- BAG and KG are independent choices. No KG-per-bag weight or fixed/variable conversion rule has been assumed. The weight/conversion question remains open for the client to clarify if desired.

## Revised client materials

- `MARS-TEXTILE-VISUAL-HANDBOOK-BAG-EDITION.pdf`: 20 pages, BAG edition shown in the footer, KG documented as optional.
- `MARS-TEXTILE-DAILY-DESK-CARD-BAG-EDITION.pdf`: one-page checklist with BAG as the normal unit.
- Fresh BAG screenshots, revised per-bag pricing and whole-bag worked example, editable HTML/content generator/assets and a ZIP share pack. The earlier PDFs are preserved on their original documentation branch; use the filenames with BAG-EDITION for this client's training.

The previous review of the uploaded/GitHub training PDF still applies: those two eight-page PDFs were identical, and the earlier training text included outdated offline-billing, menu and keeper-stock-adjustment instructions. The new BAG handbook retains the corrected current menu, role boundaries and manual/automatic sharing distinction.

## Evidence

- 65 unit tests passed; 20 migrated PostgreSQL integration tests passed, none skipped. Full textile workday checks run independently for BAG and KG, covering stock, original-document returns, direct deals/reversal, journals, backup and workbook units.
- Production build, TypeScript and lint checks passed (full lint: zero errors and 219 inherited/style warnings).
- Production-browser checks verified BAG defaults, KG choice and per-unit prices; existing KG products keep KG; a forged KG→BAG edit is rejected on the server. BAG/KG direct-deal choices and actual XLSX stock/dues values were checked.
- Real purchase, sales, receipt and return actions created the separate synthetic training company. Verified 100 − 30 + 2 = 72 bags; cost Rs 72,000; buyer due Rs 32,000; net sales Rs 42,000; net COGS Rs 28,000; gross margin Rs 14,000; books balanced. These exclude tax, discounts, opening balances, mill payments and expenses.
- Fresh guide images were captured from that company without submitting further trading documents. No client database or secrets were accessed.
- All 20 handbook pages and the desk card were checked for footer overlaps, horizontal overflow, text outside the page and blank pages. A4 page counts, selectable text, contents links, fonts/images, example arithmetic and ZIP integrity were checked. Page 19 was visually inspected after replacing the KG example.

The application update was published to the release branch separately from the document files. Hostinger deployment completion is not verified from this workspace. Manual file sharing still requires Send; automatic evening providers/scheduling and offsite backup services remain account-specific configuration and verification work.
