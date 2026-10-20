import Decimal from "decimal.js";

/** Money is rounded half-up to paisas at each line, shared by online/offline entry. */
export function lineBase(
  quantity: number,
  unitPrice: number,
  discount: number,
  isBonus?: boolean,
): number {
  if (isBonus) return 0;
  return new Decimal(quantity)
    .times(unitPrice)
    .times(new Decimal(1).minus(new Decimal(discount).div(100)))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}
export type DocumentTotals = {
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
};
export function calculateDocumentTotals<
  T extends {
    quantity: number;
    discount: number;
    taxRate: number;
    isBonus?: boolean;
  },
>(
  lines: T[],
  unitPrice: (line: T) => number,
  discountAmount: number,
): DocumentTotals {
  if (!Number.isFinite(discountAmount) || discountAmount < 0)
    throw new Error("Invalid document discount");
  let total = new Decimal(0),
    tax = new Decimal(0);
  for (const line of lines) {
    if (
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0 ||
      !Number.isFinite(unitPrice(line)) ||
      unitPrice(line) < 0 ||
      !Number.isFinite(line.discount) ||
      line.discount < 0 ||
      line.discount > 100 ||
      !Number.isFinite(line.taxRate) ||
      line.taxRate < 0 ||
      line.taxRate > 100
    )
      throw new Error("Invalid quantity, rate, discount or tax");
    const base = new Decimal(
      lineBase(line.quantity, unitPrice(line), line.discount, line.isBonus),
    );
    total = total.plus(base);
    tax = tax.plus(
      base
        .times(line.taxRate)
        .div(100)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    );
  }
  if (new Decimal(discountAmount).gt(total))
    throw new Error("Document discount exceeds the line total");
  return {
    totalAmount: total.toNumber(),
    taxAmount: tax.toNumber(),
    netAmount: Decimal.max(0, total.minus(discountAmount).plus(tax))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber(),
  };
}
