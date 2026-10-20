import Decimal from "decimal.js";

/** PostgreSQL stores quantities as NUMERIC(14,3); reject rather than round user input. */
export function validQuantity(value: unknown, signed = false): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  const quantity = new Decimal(value);
  return (
    quantity.abs().lt("100000000000") &&
    quantity.decimalPlaces() <= 3 &&
    (signed ? !quantity.isZero() : quantity.gt(0))
  );
}
export function quantityNumber(value: { toString(): string } | number): number {
  return Number(value.toString());
}
