# Client guide review — 21 October 2026

## Material reviewed

- Uploaded `CLIENT-TRAINING-GUIDE.pdf`: eight pages; SHA-256 `f814566bdf44a34ac64efbe7d5fdb854835de7c2b68fb2667ba6726098df6d75`.
- GitHub `cursor/client-training-guide-f1b9` at `b5c17ca`: `docs/CLIENT-TRAINING-GUIDE.pdf` is byte-for-byte identical to the upload. Also reviewed the training text and revised `docs/SOFTWARE-GUIDE.html` on that branch.
- GitHub `cursor/hostinger-cloud-env-208d` at `d8b285d`: `docs/Godown-Ledger-Client-Guide.pdf` is the older two-page handover guide (20 October). Its application sources match release `ca9f874`; the difference is AGENTS.md, not new app functionality.
- Reviewed the remote branch list and the other environment/older branches for additional PDF guides. No additional newer client PDF was present on those heads when checked.
- Authority for app behavior: the actual working release `client/textile-release-2026-10-20` at `ca9f874`, including `desk-access.ts`, `authorization.ts`, sidebar menu, keeper receipt/stock pages, sales/purchase/return/direct-deal actions, PDC service, evening sharing component and workbook.

The supplied documents are reference material. Their instructions do not override the client's accepted shared mill login, personal PINs, role restrictions or automatic sales stock-out choice.

## Corrections in the visual handbook

| Existing-guide issue | Correct release behavior / revised wording |
| --- | --- |
| Lists Offline Invoice as an available screen | Offline sales and offline data routes are explicitly disabled. The cloud application requires Internet. Reconnect and check the saved document before retrying. |
| Gives keeper access to Stock adjustment, with some text also granting bookkeeper posting access | Keeper can use only physical stock/mill routes. `STOCK_ADJUST` is currently owner-only. Keeper reports discrepancies; owner posts the correction. |
| Uses old Overview / Operations / System menu groups and Users as the staff/PIN entry point | The current six groups are Day book; Godown & mills; Bills & recovery; Books & accounts; Evening & reports; More. Use More → People and pins for the agreed personal desks. |
| Mixes the physical mill directory and financial mill accounts | Mills is the keeper-safe directory; Mill accounts holds payable balances and payments for the owner/bookkeeper. |
| Describes oldest-overdue allocation as though every general receipt is linked to an old invoice | General recovery reduces the buyer balance. Aging performs linked-credit-first, then general-credit FIFO allocation to the oldest open amount. Ranking uses oldest remaining overdue date, then balance. It does not rewrite receipt links. |
| Includes a generic PDC “cleared” stage | Current interface offers Pending, Deposited and Bounced. A PDC creates its linked cheque receipt/payment on entry; depositing moves the clearing balance, bouncing reverses the related events. Do not record it twice or describe pending cheques as cash. |
| Broadly says salesman cannot export, while some recovery exports are permitted | Distinguishes permitted recovery work from the complete financial evening workbook, which is owner/bookkeeper only. Avoids an inaccurate blanket export ban. |
| Describes “Email the note” as sending | It opens a text email draft. The user must attach the downloaded Excel file and send it. The WhatsApp web link cannot automatically attach a local file. |
| Demonstrates demo/developer credentials and technical paths among staff instructions | No demo login credentials, database instructions or deployment commands appear in client training. Use the owner's supplied login and the visible menu labels. |
| Makes feature lists read like activation of external services | Manual Excel sharing is included. Automatic scheduled WhatsApp/email and offsite backup destinations still require actual account setup and verification. Tax summary is not FBR e-invoicing or electronic filing. |

## Deliverables

- `MARS-TEXTILE-VISUAL-HANDBOOK.pdf`: 20 A4 pages, linked contents, selectable text, 7 selected current-release screenshots, process diagrams, role cards, worked example and complete process coverage.
- `MARS-TEXTILE-DAILY-DESK-CARD.pdf`: one A4 page, daily role checklist, Excel sending steps and support reminder.
- Editable HTML, content generator, screenshot assets, font licences and a client guide pack ZIP.

## Validation performed

- Captured current-release UI against the isolated `godown_visual_qa` database using existing synthetic fixtures. Authenticated screenshot capture reported no page errors; no sales, purchases, receipts, returns or direct deals were submitted during capture. The receipt and bill examples are unsent forms.
- Checked all 20 handbook pages and the one-page desk card for text/footer overlap and horizontal overflow using browser geometry; no failures. Images and local fonts loaded successfully.
- Checked PDF page count, A4 dimensions, text presence, content bounds and internal contents links. Inspected rendered page previews/contact sheet, including detailed sales and Excel sharing pages. The handbook is tagged and has selectable text.
- Rechecked the worked example independently: stock 12.500 − 2.750 + 0.500 = 10.250 KG; stock cost Rs 1,025; buyer due 412.50 − 100 − 75 = Rs 237.50; net sales Rs 337.50; net COGS Rs 225; margin Rs 112.50. Example excludes tax, discounts, openings, mill payments and office expenses.
- Publication is on a separate documentation branch. No app code, production environment, live database or Hostinger deployment branch is changed by this guide work. The client's exact deployed version still needs to match the release used for training.

## What this review does not establish

This is an application-aligned training review and document production task, not a fresh financial audit or proof of actual provider delivery. No client secrets or live data were accessed. Do not represent automatic delivery or offsite backups as active solely because they are described in the guide.
