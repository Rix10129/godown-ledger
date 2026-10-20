# Godown Ledger — Lahore office

Open the company HTTPS address supplied at handover. No Node.js, database or GitHub installation is needed on office PCs or phones. This textile company has its own empty book; nothing is connected to the poultry software.

## Start the desk

Use the shared mill email and password. Select your name and enter your own four-digit PIN. A wrong PIN does not open the desk; five wrong attempts lock that person's PIN for 15 minutes. The owner can reset a person's PIN.

| Person        | Work available                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Godown keeper | Mills, physical stock and unpriced cloth receipts; no rates or books                                                                     |
| Salesman      | Bills, buyers and recovery; no purchase costs or books                                                                                   |
| Bookkeeper    | Recovery, receipt pricing, purchases, returns, direct deals, accounts, ledger and evening note; no people administration or full backups |
| Owner         | Everything; manages people and backups                                                                                                   |

The owner adds people under **More → People and pins**. Each PIN must differ from the others. Staff cannot be assigned owner access there. Keep the owner PIN private. Press **Leave the desk** before someone else uses the computer; do not give staff the owner PIN. The owner can disable staff immediately. Owner PIN changes lock all owner desks.

## A normal day's work

1. The owner/bookkeeper adds products (cloth quality/count, unit, default rates) and buyers. The keeper adds mills if needed.
2. The keeper records received cloth under Stock: mill, product, lot/thaan number, fractional quantity, and shade/quality/location notes. This is waiting for a rate, not saleable stock.
3. The bookkeeper opens **Price received cloth**, checks the mill's bill and adds cost/selling rates. Posting makes the lot saleable and credits the mill. Alternatively the bookkeeper records a full priced purchase directly.
4. The salesman makes a bill against a specific lot. KG, metres and thaan quantities allow up to 3 decimals. Cloth needs no expiry date. A credit bill must have a registered buyer; a walk-in bill must be fully paid.
5. Record recovery against that buyer. Record payments to mills separately. Post-dated cheques remain uncleared until deposited/presented; they are not available cash.
6. For cloth delivered straight from the mill to a buyer, the owner/bookkeeper uses **Direct deals**. Choose both parties, quantity, cost and selling rate. Godown stock never changes. A salesman can see the sales bill and collect its recovery without seeing the purchase cost.
7. Make returns from the **original bill or purchase**. Only its unreturned quantity may be returned. The original price, tax and cost are verified on the server. A purchase return is a credit to the mill account; a walk-in sale return refunds cash. Direct deals do not return stock: reverse their linked payments first and reverse the deal from Direct deals.
8. At close, review **Evening note**, **P&L**, **Trial balance**, and **Balance sheet**. The evening note flags a mismatch between remaining stock cost and inventory books. Use Share on WhatsApp/Email the note, then press Send in that application unless automatic delivery has been configured and verified.
9. Download an encrypted backup at close. Confirm the nightly destination and review failures with the administrator.

All computers use the same server database. Read screens refresh automatically about every five seconds while visible and online. Updates pause while you are entering data; finish the entry or reopen the screen to refresh. The system prevents concurrent overselling; an open form does not reserve stock. Do not re-enter a bill until you have checked whether the original was posted after a connection interruption.

## First-day figures and support

Historical manual books are not being imported for today's launch. The owner/accountant must decide the start date and approve any opening stock, cash/bank, buyer dues and mill payables entered. Starting with empty books is not the same as recording the old balances. Do not mix guessed opening figures with real trading.

This launch requires Internet access. If disconnected, do not assume a bill was posted. Reconnect and check the bill list. Cloud hosting continues running when an office browser or the implementer's laptop closes.

For support, send the administrator the bill number, screen, time in Pakistan, and error text. Do not send passwords, PINs, database URLs, decrypted backups or encryption keys in chat. Record the final HTTPS address, hosting/database account owner, support contact and agreed backup frequency in the signed handover.

FBR electronic invoicing, automated delivery provider approval, structured multi-godown transfers, per-thaan length conversion and dyeing/job-work tracking require separate setup or development; this release does not represent those as completed services.
