# Bag-based trading — 21 October 2026

Mars Textile trades primarily per bag. For a new product choose **BAG**, enter the number of bags for receipts/bills/returns, and enter purchase/selling rates **per bag**. New products and direct deals default to BAG. KG remains available for products traded by weight; existing metre/thaan and other catalogue units remain supported.

Use a separate product for stock traded in a different unit. Existing products keep their original unit, enforced in the update action. This prevents changing a historical KG quantity into a bag count by changing only its label. Do not recreate existing opening balances or duplicate old stock just to adopt the new default; agree any real transition with the bookkeeper and reconcile the original lot.

There is no assumed KG weight per bag or automatic unit conversion. Sub Unit and Units per Pack are catalogue metadata. A fixed/variable-weight conversion process would need the client's agreed rules before implementation. This clarification leaves the weight question open while enabling correct independent BAG and KG trading.

Receipt pricing, sales and returns follow the product's primary unit. Direct deals have their own explicit unit. Stock and workbook exports retain units rather than adding bag counts to KG quantities. Stock cost and money totals are in currency and can be totalled across products.

The revised BAG edition of the visual handbook replaces the earlier KG-centred training examples. Its whole-bag example is verified using real actions in a separate synthetic training company:

| Event                           | Quantity / amount                            |
| ------------------------------- | -------------------------------------------- |
| Purchase                        | 100 bags × Rs 1,000 = Rs 100,000 payable     |
| Credit sale                     | 30 bags × Rs 1,500 = Rs 45,000 bill          |
| Recovery                        | Rs 10,000 received                           |
| Buyer return                    | 2 bags × original Rs 1,500 = Rs 3,000 credit |
| Remaining physical stock        | 100 − 30 + 2 = 72 bags                       |
| Remaining stock cost            | 72 × Rs 1,000 = Rs 72,000                    |
| Buyer outstanding               | Rs 45,000 − 10,000 − 3,000 = Rs 32,000       |
| Net sales / COGS / gross margin | Rs 42,000 / Rs 28,000 / Rs 14,000            |

No tax, discounts, openings, mill payments or office expenses are included in that illustration. No new database migration or environment setting is required for this update. Keep existing Hostinger variables and deploy the latest release branch; verify the resulting BAG defaults and sample unit labels there.
