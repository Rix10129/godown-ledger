# Customer order request — 7 November 2026

## Compiled message (one speaker, Roman Urdu)

Assalam o Alaikum Faris bhai. Customer orders mein quality ka dropdown hata kar seedha naam likhne ki sahulat de dein. Hum bags ya kapray ki quality khud likh sakein, kyun ke dropdown mein bag ki option nahi aa rahi. Ek customer ke kai orders ho sakte hain: misal ke taur par ek quality ke 100 bags, phir usi quality ke 200 bags, aur doosri qualities ke bhi orders. Delivery ko FIFO, yani pehle aane wale order ko pehle poora karne ke tareeqay par adjust karein.

## Implemented behavior

- Type the quality and choose BAG, METER or KG. Exact names match without case sensitivity; different units remain separate products. Authorized master-data users can create an unknown quality when placing the order. Ambiguous duplicate catalogue names require correction rather than an arbitrary match.
- A new bill automatically allocates its quantities to the oldest open orders for that customer and product, ordered by order date and document number. Multiple order lines and stock batches share the same remaining balances inside the posting transaction.
- Example: orders 100 and 200; delivery 150 fills the first and 50 of the second. Another delivery of 175 fills the remaining 150 and records 25 as an ordinary sale.
- The bill's selling rate remains the rate entered on the bill. Bonus stock does not fill paid orders. Other customers, products, closed orders and reversed invoices do not consume these balances.
- Existing explicit order links remain validated for compatibility. Existing invoice reversal and correction restrictions are retained. Posted deliveries release their order allocation when the invoice is reversed.
- Normal and sync posting routes use the same allocator. No stock or accounting posting occurs when an order is created, and no historical invoice is retroactively reassigned.

No database migration is required.
