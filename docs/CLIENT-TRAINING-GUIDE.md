# Godown Ledger — Client training guide

**Audience:** Owner, bookkeeper, godown keeper, and sales staff at a textile trading office.  
**Purpose:** Learn what each part of the software does and how your team uses it day to day.  
**Updated:** 21 October 2026 (Pakistan time).

---

## 1. What this software is

Godown Ledger is a **web application** for mill-to-market textile trading:

- Receive yarn/cloth in the **godown** (warehouse), lot by lot.
- **Price** received stock, then **sell** against specific lots (FEFO/FIFO).
- Track **buyer udhar** (credit) and **recovery** (collections).
- Pay **mills** and manage **accounts** (double-entry books).
- Run **reports**, **evening close**, and **encrypted backups**.

Office computers and phones only need a **browser** and **internet**. You do not install Node.js, PostgreSQL, or Git on staff PCs.

For Lahore production handover specifics (PIN desk, Excel WhatsApp flow), also read **`CLIENT-HANDOVER.md`** in this folder.

---

## 2. Opening the system

### Production (Lahore office)

1. Open the **HTTPS address** supplied at handover (bookmark it on every desk).
2. Sign in with the **shared mill email and password**.
3. Select **your name** and enter your **four-digit PIN**.
4. When you leave the computer, press **Leave the desk** so the next person uses their own PIN.

| Rule | Detail |
| --- | --- |
| Wrong PIN | Does not open the desk |
| Lockout | Five wrong attempts → PIN locked **15 minutes** |
| Owner PIN | Private — never give to staff |
| People | Owner adds staff under **Users** (or **More → People and pins** on some builds) |

### Demo / developer login (training only)

If your trainer uses a demo server, log in with **email + password** and role-based accounts (see trainer’s credentials sheet). Production clients should **not** rely on demo logins.

---

## 3. Who does what (roles)

| Role | Typical person | Can do | Cannot do |
| --- | --- | --- | --- |
| **Godown keeper** (Storekeeper) | Warehouse | Mills, physical stock, unpriced receipts, adjustments | See rates, books, or buyer balances |
| **Salesman** | Field / counter sales | Bills, buyers, recovery | Purchase costs, full accounts, exports |
| **Bookkeeper** (Accountant) | Office accounts | Price stock, purchases, returns, direct deals, ledger, evening note, exports | User admin, full backup restore (owner) |
| **Owner** | Proprietor | Everything — people, settings, backups | — |
| **Cashier** (if used) | Counter | Quick sales and receipts | Most masters and accounting |

Exact permissions are enforced on the server; hiding a menu item is **not** security. If someone sees “Forbidden”, their role is not allowed that action.

---

## 4. One normal trading day (recommended order)

Use this as your **daily checklist** until it becomes habit.

| Step | Who | Where in app | What happens |
| --- | --- | --- | --- |
| 1 | Owner / bookkeeper | **Inventory**, **Buyers**, **Mills** | Products (quality/count, unit, default rates) and buyers exist |
| 2 | Keeper | **Inventory** → receive stock | Cloth received: mill, product, **lot/thaan**, quantity (up to 3 decimals), shade/location notes — **waiting for rate**, not saleable |
| 3 | Bookkeeper | **Price received cloth** (or priced **Purchase**) | Adds cost/selling rates; lot becomes **saleable**; mill credited |
| 4 | Salesman | **Sales** → new bill | Bill against a **specific lot**; credit needs registered buyer; walk-in must be **fully paid** |
| 5 | Salesman / bookkeeper | **Buyers** → recovery | Money from buyers; allocated to oldest overdue first |
| 6 | Bookkeeper | Mill payments / **Purchases** | Pay mills; **PDC cheques** stay uncleared until deposited |
| 7 | Owner / bookkeeper | **Direct deals** | Mill → buyer without godown stock (see §7) |
| 8 | Any authorised role | **Returns** from original bill/purchase | Server checks qty, price, cost |
| 9 | Owner / bookkeeper | **Evening close**, **P&L**, **Trial balance**, **Balance sheet** | Reconcile day; share Excel note (§12) |
| 10 | Owner | **Settings** → backup | Encrypted backup; key stored separately |

---

## 5. Sidebar map (every main screen)

The left menu is grouped as follows. Paths are the URL after your site address.

### Overview

| Menu | Path | Purpose |
| --- | --- | --- |
| **Dashboard** | `/` | Today’s sales, receivables, low stock, recent bills |
| **Alerts** | `/alerts` | Expiry and low-stock warnings (textile lots often have no expiry) |

### Operations

| Menu | Path | Purpose |
| --- | --- | --- |
| **Inventory** | `/inventory` | Products, batches/lots, on-hand qty, movement history |
| **Reorder Sheet** | `/inventory/reorder` | Items at or below reorder level |
| **Stock Adjustment** | `/inventory/adjustments/new` | Correct physical count (shrinkage, recount) — keeper/bookkeeper |
| **Sales** | `/sales` | Create and view **posted** sale invoices |
| **Offline Invoice** | `/sales/offline` | Queue bills when connection is poor; sync when back online |
| **Purchases** | `/purchases` | Mill purchases and returns |
| **Expenses** | `/expenses` | Operating expenses by category |

### People

| Menu | Path | Purpose |
| --- | --- | --- |
| **Buyers** | `/customers` | Customer master, balance, recovery, statements |
| **Mills** | `/suppliers` | Supplier master and payables |
| **Pay Schedule** | `/suppliers/schedule` | Planned mill payments |

### Sales (field)

| Menu | Path | Purpose |
| --- | --- | --- |
| **Quotations** | `/quotations` | Quotes before billing |
| **Routes** | `/routes` | Route/visit planning for salesmen |

### Finance

| Menu | Path | Purpose |
| --- | --- | --- |
| **Accounts** | `/accounts` | Chart of accounts, cash payment/received, opening balance, ledger |
| **Bank Accounts** | `/accounts/bank` | Bank balances and movements |
| **PDC Cheques** | `/accounts/pdc` | Post-dated cheques: pending → deposited → cleared/bounced |

### Analytics

| Menu | Path | Purpose |
| --- | --- | --- |
| **Reports** | `/reports` | Hub for all report cards |
| **Evening close** | `/reports/evening` | Day summary text + Excel preparation |
| **Sales Targets** | `/reports/targets` | Monthly targets vs achievement |
| **P&L Statement** | `/reports/pl` | Profit and loss for a period |
| **Balance Sheet** | `/reports/balance-sheet` | Assets, liabilities, equity snapshot |

### System

| Menu | Path | Purpose |
| --- | --- | --- |
| **Users** | `/users` | Staff accounts and roles (owner/admin) |
| **Settings** | `/settings` | Company profile, sequences, backup export |

---

## 6. Inventory and lots (godown)

### Concepts

- **Product** — cloth type (quality, count, unit: kg / metre / thaan).
- **Batch / lot** — one receipt from a mill with its own quantity and optional lot number.
- **FEFO** — system prefers earliest-expiry lots; textile often uses **FIFO by receive date** when there is no expiry.
- **Movement history** — every in/out with document reference and Pakistan date (keeper view may hide money).

### Keeper workflow

1. **Receive** cloth → status **waiting for rate** (not on sale list).
2. Do **not** dispatch again when a sales bill is posted — stock deducts automatically.
3. Use **Stock adjustment** only for physical corrections, with a clear reason.

### Bookkeeper workflow

1. Open **Price received cloth** (or enter a full **Purchase** with rates).
2. After posting, lot appears as **saleable** stock.
3. Review **Stock valuation** report for cost value.

---

## 7. Sales, recovery, and direct deals

### Sales invoice

- Every line must reference a **lot** with enough quantity.
- **Credit (udhar):** buyer must exist on file.
- **Cash / walk-in:** must be **fully paid** at posting.
- Quantities: up to **3 decimal places** where needed.

### Recovery

- Record payments against buyers from the buyer ledger or receipt screens.
- Allocation: **oldest overdue invoice first**, then amount.
- Opening balances without invoice dates appear in **aging** as undated.

### Direct deals (mill → buyer, no godown)

- Owner/bookkeeper enters: mill, buyer, quantity, **cost** and **selling** rate.
- **Godown stock unchanged.**
- Salesman may see the **sales side** and collect recovery **without** seeing purchase cost.
- Returns: reverse linked payments first, then reverse the deal — **no stock return**.

---

## 8. Purchases, mills, and returns

- **Purchase order** increases stock (when priced) and mill payable.
- **Purchase return** reduces stock and **credits** the mill; only from original purchase, unreturned qty.
- **Sale return** reduces buyer balance; walk-in returns may refund cash.
- Always start returns from the **original document** so prices and tax stay correct.

---

## 9. Accounts (books)

Godown Ledger uses **double-entry accounting**: every financial event creates balanced journal lines.

| Task | Typical entry point |
| --- | --- |
| Cash in / out | **Accounts** → cash received / cash payment |
| Opening balances | Opening balance wizard (owner/accountant) |
| Manual correction | **Vouchers** (journal entries) |
| Day book | **Ledger** |
| Bank | **Bank accounts** |
| PDC | **PDC cheques** — not counted as cleared cash until presented |

End of month: **Trial balance** must tie; then **P&L** and **Balance sheet**.

---

## 10. Reports catalog

Open **Reports** for the full list. Common reports:

| Report | Use when |
| --- | --- |
| Evening close | End-of-day WhatsApp / owner review |
| Sales / Sales detail | Register of bills and line profit |
| Sales by customer | Monthly buyer totals |
| Cash receiving (product-wise) | Which products cash related to |
| Purchases | Mill-wise buying |
| Stock valuation | Qty and value in godown |
| Customer recovery | Who owes what |
| Aging | 0–30, 31–60, 61–90, 90+ buckets |
| Collection | Salesman collections by day |
| Salesman performance | Sales vs recovery % |
| Area-wise | Route/area grouping |
| FBR tax summary | GST summary for filing prep |
| Audit log | Who accessed what (owner/admin) |

---

## 11. Multi-desk behaviour (important)

- All desks share **one database** on the server.
- List screens **refresh about every 5 seconds** while visible and online.
- Refresh **pauses** while you are typing — finish the form or reopen the screen.
- Two users cannot oversell the same lot — second post gets an error; **do not duplicate** a bill after a connection glitch until you check the bill list.
- **Internet required** for cloud hosting; private financial pages are not stored offline on the device.

---

## 12. Evening close and Excel sharing

1. Open **Evening close** — review purchases, sales, recovery, mill payments, stock flags.
2. **Prepare Excel for WhatsApp** (owner/bookkeeper).
3. **Phone:** **Share Excel file** when the browser supports it.
4. **Desktop:** **Download prepared Excel** → WhatsApp → **Attach → Document**.
5. **Email the note** sends text only — attach the workbook yourself.

The workbook has **11 tabs**: Summary, Purchases, Sales, Recovery, Mill Payments, Stock, Returns, Waiting for Rate, Buyer Dues, Accounts, Evening Note. Dates use **Pakistan time**. Prepare a **fresh copy** if entries change before sending.

Automatic scheduled email/WhatsApp delivery is **separate setup** — confirm with your administrator.

---

## 13. Backups and first-day balances

- **Owner** downloads **encrypted** backups; store the **passphrase/key separately** from the file.
- Nightly cloud backup may be configured by your implementer — confirm destination and test restore quarterly.
- **Historical manual books** are not auto-imported. Agree **launch date** and opening stock, cash, buyer dues, and mill payables with the owner/accountant before live trading.
- Never send passwords, PINs, database URLs, or decrypted backups in WhatsApp chat.

See **`BACKUP-RECOVERY.md`** for technical recovery (IT/admin).

---

## 14. Suggested training plan for your client

Train in this order over **3–5 short sessions** (30–45 minutes each):

| Session | Audience | Topics | Practice exercise |
| --- | --- | --- | --- |
| **A** | Everyone | Login, leave desk, dashboard, sync rules | Each person logs in and out once |
| **B** | Keeper | Receive unpriced cloth, movement history | One real lot with notes |
| **C** | Bookkeeper | Price stock, one purchase, stock report | One lot from waiting → saleable |
| **D** | Salesman | One credit bill, one cash bill, recovery | Bill against priced lot; record partial recovery |
| **E** | Bookkeeper + owner | Returns, PDC, direct deal demo | Return line from original bill |
| **F** | Owner + bookkeeper | Evening close, Excel share, P&L/trial balance | Full close on a training day |
| **G** | Owner only | Users/PINs, backup download | Add test user; download backup |

Keep a **one-page cheat sheet** (§4) laminated at each desk.

---

## 15. Support checklist

When something fails, send your administrator:

1. **Bill or document number**
2. **Screen name** (menu item)
3. **Time in Pakistan**
4. **Exact error text** (screenshot)

Do **not** send secrets or decrypted backups.

---

## 16. Not included in this release (unless separately agreed)

- FBR electronic invoicing integration
- Fully automated evening delivery without provider setup
- Multi-godown transfers, per-thaan length conversion, dyeing/job-work modules

---

## Related files in `docs/`

| File | For |
| --- | --- |
| `CLIENT-HANDOVER.md` | Signed Lahore launch checklist |
| `SOFTWARE-GUIDE.html` | Printable full guide (open in browser → Print → PDF) |
| `AUTHORIZATION.md` | Role permissions (admin) |
| `BACKUP-RECOVERY.md` | Disaster recovery (admin) |
| `document-numbering.md` | Invoice/PO number sequences |

---

*Godown Ledger · Mill-to-Market Trading · Confidential — authorised users only.*
